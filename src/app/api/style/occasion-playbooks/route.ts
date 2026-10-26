import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET() {
  try {
    const supabase = await createClient();
    const [playbooks, gapGuides] = await Promise.all([
      supabase.from("occasion_playbooks").select("id,occasion,display_name,dress_codes,priorities,styling_guidance,shopping_guidance,cultural_note,source_urls,sort_order").order("sort_order").limit(30),
      supabase.from("shopping_gap_guides").select("id,occasion,category,when_to_consider,alternatives,budget_guidance,source_urls").limit(100),
    ]);
    if (playbooks.error || gapGuides.error) {
      return NextResponse.json({ error: "The occasion research library is not available yet." }, { status: 503 });
    }
    return NextResponse.json({
      playbooks: playbooks.data || [],
      shoppingGapGuides: gapGuides.data || [],
      updatedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch {
    return NextResponse.json({ error: "The occasion research library is temporarily unavailable." }, { status: 503 });
  }
}
