import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const revalidate = 3600;
export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("external_product_picks")
      .select("id,title,merchant_name,category,style_tags,occasion_tags,observed_price_kes,product_url,research_source_url,review_note,reviewed_at")
      .eq("is_active", true).order("reviewed_at", { ascending: false }).limit(80);
    if (error) return NextResponse.json({ error: "Research picks are temporarily unavailable." }, { status: 503 });
    return NextResponse.json({ picks: data || [], status: "research_only", pricing: "snapshot_not_live" }, { headers: { "Cache-Control": "public,s-maxage=3600,stale-while-revalidate=86400" } });
  } catch {
    return NextResponse.json({ error: "Research picks are temporarily unavailable." }, { status: 503 });
  }
}
