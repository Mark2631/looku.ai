import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/config";

export const runtime = "nodejs";
const STATE_COOKIE = "looku-calendar-oauth-state";

function configured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.CALENDAR_TOKEN_ENCRYPTION_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const base = getAppUrl().replace(/\/$/, "");
  if (!user) return NextResponse.redirect(new URL("/auth?mode=signin", base));
  if (!configured()) return NextResponse.redirect(new URL("/?calendar=not_configured", base));

  const state = randomBytes(32).toString("base64url");
  const callback = base + "/api/calendar/callback";
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  auth.searchParams.set("redirect_uri", callback);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", "openid email https://www.googleapis.com/auth/calendar.events.readonly");
  auth.searchParams.set("state", state);
  auth.searchParams.set("access_type", "offline");
  auth.searchParams.set("prompt", "consent");
  auth.searchParams.set("include_granted_scopes", "true");

  const response = NextResponse.redirect(auth);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/api/calendar", maxAge: 600,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
