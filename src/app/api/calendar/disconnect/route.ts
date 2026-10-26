import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { decryptCalendarToken } from "@/lib/calendar-crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (origin && host) {
    try { if (new URL(origin).host !== host) return NextResponse.json({ error: "Cross-origin calendar changes are not allowed." }, { status: 403 }); }
    catch { return NextResponse.json({ error: "Invalid request origin." }, { status: 403 }); }
  }
  const session = await createClient();
  const { data: { user }, error: authError } = await session.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to disconnect your calendar." }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Calendar storage is not configured." }, { status: 503 });
  const admin = createSupabaseClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: connection } = await admin.from("calendar_connections").select("access_token_encrypted").eq("user_id", user.id).maybeSingle();
  if (connection?.access_token_encrypted) {
    try {
      const token = decryptCalendarToken(connection.access_token_encrypted);
      await fetch("https://oauth2.googleapis.com/revoke?token=" + encodeURIComponent(token), { method: "POST", signal: AbortSignal.timeout(4000) }).catch(() => undefined);
    } catch { /* Delete local authorization even if best-effort provider revocation fails. */ }
  }
  const { error } = await admin.from("calendar_connections").delete().eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Could not remove the calendar connection." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
