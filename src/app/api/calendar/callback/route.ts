import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/config";
import { encryptCalendarToken } from "@/lib/calendar-crypto";

export const runtime = "nodejs";
const STATE_COOKIE = "looku-calendar-oauth-state";

function redirect(base: string, status: string) {
  const response = NextResponse.redirect(new URL("/?calendar=" + encodeURIComponent(status), base));
  response.cookies.delete(STATE_COOKIE);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const base = getAppUrl().replace(/\/$/, "");
  const providerError = request.nextUrl.searchParams.get("error");
  if (providerError) return redirect(base, "cancelled");

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state || state !== request.cookies.get(STATE_COOKIE)?.value) return redirect(base, "state_error");

  const sessionClient = await createClient();
  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !user) return NextResponse.redirect(new URL("/auth?mode=signin", base));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!supabaseUrl || !serviceKey || !clientId || !clientSecret || !process.env.CALENDAR_TOKEN_ENCRYPTION_KEY) return redirect(base, "not_configured");

  try {
    const body = new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: base + "/api/calendar/callback", grant_type: "authorization_code",
    });
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, cache: "no-store", signal: AbortSignal.timeout(9000),
    });
    if (!tokenResponse.ok) return redirect(base, "token_error");
    const tokens = await tokenResponse.json() as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; token_type?: string };
    if (!tokens.access_token || !tokens.refresh_token) return redirect(base, "refresh_token_missing");

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: "Bearer " + tokens.access_token }, cache: "no-store", signal: AbortSignal.timeout(7000),
    });
    const googleProfile = profileResponse.ok ? await profileResponse.json() as { email?: string } : {};
    const admin = createSupabaseClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await admin.from("calendar_connections").upsert({
      user_id: user.id, provider: "google", account_email: googleProfile.email || null,
      access_token_encrypted: encryptCalendarToken(tokens.access_token),
      refresh_token_encrypted: encryptCalendarToken(tokens.refresh_token),
      expires_at: new Date(Date.now() + Math.max(60, tokens.expires_in || 3600) * 1000).toISOString(),
      scopes: (tokens.scope || "").split(" ").filter(Boolean), updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) return redirect(base, "save_error");
    return redirect(base, "connected");
  } catch {
    return redirect(base, "provider_error");
  }
}
