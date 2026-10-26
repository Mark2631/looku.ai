import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/config";
export async function GET() {
  return NextResponse.json({ app: "looku", status: "ok", backendConfigured: isSupabaseConfigured(), aiGatewayKeyConfigured: Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN), adminCatalogConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.LOOKU_ADMIN_EMAILS) }, { headers: { "Cache-Control": "no-store" } });
}
