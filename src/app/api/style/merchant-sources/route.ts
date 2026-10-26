import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("merchant_sources")
      .select("id,name,website,country_code,categories,business_model,integration_path,public_evidence,source_url,relationship_status")
      .contains("country_code", ["KE"])
      .order("name")
      .limit(30);
    if (error) return NextResponse.json({ error: "Merchant research is not available yet." }, { status: 503 });
    return NextResponse.json({ sources: data || [] }, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json({ error: "Merchant research is temporarily unavailable." }, { status: 503 });
  }
}
