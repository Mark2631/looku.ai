import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/config";

export async function GET() {
  return NextResponse.json({
    app: "looku",
    status: "ok",
    backendConfigured: isSupabaseConfigured(),
    aiGatewayKeyConfigured: Boolean(process.env.AI_GATEWAY_API_KEY),
    aiGatewayMode: process.env.AI_GATEWAY_API_KEY ? "api-key" : process.env.VERCEL ? "vercel-oidc" : "not-configured",
    calendarConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.CALENDAR_TOKEN_ENCRYPTION_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY),
    weatherConfigured: Boolean(process.env.WEATHERAPI_KEY),
    tryOnConfigured: Boolean(process.env.FASHN_API_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY),
    adminCatalogConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.LOOKU_ADMIN_EMAILS),
  }, { headers: { "Cache-Control": "no-store" } });
}
