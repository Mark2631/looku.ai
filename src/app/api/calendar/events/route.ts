import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { decryptCalendarToken, encryptCalendarToken } from "@/lib/calendar-crypto";

export const runtime = "nodejs";

function credentialsConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.CALENDAR_TOKEN_ENCRYPTION_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export async function GET() {
  const session = await createClient();
  const { data: { user }, error: authError } = await session.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to import calendar events." }, { status: 401 });
  if (!credentialsConfigured()) return NextResponse.json({ configured: false, connected: false, events: [], message: "Google Calendar requires OAuth credentials and encrypted token storage configured on the server." }, { headers: { "Cache-Control": "no-store" } });

  const admin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: connection, error } = await admin.from("calendar_connections").select("*").eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not read the calendar connection." }, { status: 500 });
  if (!connection) return NextResponse.json({ configured: true, connected: false, events: [] }, { headers: { "Cache-Control": "no-store" } });

  try {
    let accessToken = decryptCalendarToken(connection.access_token_encrypted);
    const refreshToken = decryptCalendarToken(connection.refresh_token_encrypted);
    if (!connection.expires_at || new Date(connection.expires_at).getTime() < Date.now() + 120000) {
      const form = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken, grant_type: "refresh_token",
      });
      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form, cache: "no-store", signal: AbortSignal.timeout(9000),
      });
      if (!refreshResponse.ok) {
        await admin.from("calendar_connections").delete().eq("user_id", user.id);
        return NextResponse.json({ error: "Google Calendar authorization expired. Please reconnect it.", connected: false }, { status: 401 });
      }
      const refreshed = await refreshResponse.json() as { access_token?: string; expires_in?: number };
      if (!refreshed.access_token) return NextResponse.json({ error: "Google did not return a refreshed access token." }, { status: 502 });
      accessToken = refreshed.access_token;
      const { error: updateError } = await admin.from("calendar_connections").update({
        access_token_encrypted: encryptCalendarToken(accessToken),
        expires_at: new Date(Date.now() + Math.max(60, refreshed.expires_in || 3600) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
      if (updateError) return NextResponse.json({ error: "Could not update the encrypted calendar token." }, { status: 500 });
    }

    const now = new Date();
    const limit = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.set("timeMin", now.toISOString());
    url.searchParams.set("timeMax", limit.toISOString());
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("fields", "items(id,summary,description,location,start(date,dateTime),end(date,dateTime),htmlLink,status)");
    const response = await fetch(url, { headers: { Authorization: "Bearer " + accessToken }, cache: "no-store", signal: AbortSignal.timeout(9000) });
    if (!response.ok) return NextResponse.json({ error: "Google Calendar could not return your events." }, { status: 502 });
    const data = await response.json() as { items?: { id: string; summary?: string; description?: string; location?: string; start?: { date?: string; dateTime?: string }; end?: { date?: string; dateTime?: string }; htmlLink?: string; status?: string }[] };
    const events = (data.items || []).filter(event => event.status !== "cancelled" && event.id && (event.start?.dateTime || event.start?.date)).map(event => ({
      id: event.id, title: (event.summary || "Calendar event").slice(0, 140),
      description: (event.description || "").slice(0, 1000), location: (event.location || "").slice(0, 200),
      start: event.start?.dateTime || event.start?.date || "", end: event.end?.dateTime || event.end?.date || "",
      url: event.htmlLink || null,
    }));
    return NextResponse.json({ configured: true, connected: true, accountEmail: connection.account_email, events }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Calendar connection could not be refreshed safely. Reconnect it and try again." }, { status: 502 });
  }
}
