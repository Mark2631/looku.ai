import { generateText } from "ai";
import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const requestSchema = z.object({ occasion: z.string().trim().min(1).max(80).default("Everyday"), prompt: z.string().trim().max(1000).default("Choose a good outfit for me."), count: z.number().int().min(1).max(3).default(3) });
const resultSchema = z.object({ outfits: z.array(z.object({ title: z.string().min(1).max(100), style: z.string().max(80).default("Personal edit"), reason: z.string().min(1).max(500), itemIds: z.array(z.string().uuid()).min(2).max(6), confidenceNote: z.string().max(180).optional() })).min(1).max(3) });
function parseJson(text: string) {
  const from = text.indexOf("{");
  const to = text.lastIndexOf("}");
  if (from < 0 || to <= from) throw new Error("No JSON object returned");
  return JSON.parse(text.slice(from, to + 1));
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to use your personal stylist." }, { status: 401 });
    const body = requestSchema.safeParse(await request.json());
    if (!body.success) return NextResponse.json({ error: "Check the occasion and styling request." }, { status: 400 });

    const { data: allowed, error: quotaError } = await supabase.rpc("consume_ai_quota", { p_daily_limit: 20 });
    if (quotaError) return NextResponse.json({ error: "AI usage controls are not ready. Apply the LOOKU database migration before using the stylist." }, { status: 503 });
    if (!allowed) return NextResponse.json({ error: "You've reached today's AI styling limit. Your saved wardrobe is still available; try again tomorrow." }, { status: 429 });

    const { data: items, error: itemsError } = await supabase.from("wardrobe_items").select("id,name,brand,category,colors,pattern,formality,seasons,style_tags,status,attributes").eq("user_id", user.id).eq("is_owned", true).eq("status", "available").limit(120);
    if (itemsError) return NextResponse.json({ error: "Couldn't read your wardrobe. Please try again." }, { status: 500 });
    if (!items || items.length < 2) return NextResponse.json({ error: "Add at least two available wardrobe items before generating an outfit." }, { status: 422 });

    const prompt = [
      "You are LOOKU, a careful personal stylist. Build outfits ONLY from the wardrobe items supplied below.",
      "Do not invent item IDs, brands, garments, body measurements, weather or event information. Every outfit must use at least two different supplied item IDs and at most six.",
      "Use category logic (a top with a bottom, or a dress with suitable shoes), color balance, pattern balance, occasion formality, season suitability, comfort and the user's request. Avoid claiming physical fit or fabric properties not present in the attributes.",
      "Return exactly the requested number where possible, otherwise return fewer strong options. Avoid near-duplicate alternatives. Keep reasons specific and plain-language.",
      "Return valid JSON only: {\"outfits\":[{\"title\":\"...\",\"style\":\"...\",\"reason\":\"...\",\"itemIds\":[\"uuid\",\"uuid\"],\"confidenceNote\":\"...\"}]}.",
      "Requested occasion: " + body.data.occasion,
      "User instruction: " + body.data.prompt,
      "Requested options: " + body.data.count,
      "User wardrobe (the IDs below are the only allowed item references): " + JSON.stringify(items)
    ].join("\n\n");
    const result = await generateText({ model: process.env.LOOKU_AI_MODEL || "google/gemini-2.5-flash", prompt, temperature: 0.35, maxOutputTokens: 1500 });
    const parsed = resultSchema.safeParse(parseJson(result.text));
    if (!parsed.success) return NextResponse.json({ error: "The stylist returned a result we couldn't validate. Try a more specific occasion." }, { status: 502 });
    const validIds = new Set(items.map(item => item.id));
    const outfits = parsed.data.outfits.map(outfit => ({ ...outfit, itemIds: Array.from(new Set(outfit.itemIds)).filter(id => validIds.has(id)) })).filter(outfit => outfit.itemIds.length >= 2);
    if (!outfits.length) return NextResponse.json({ error: "No valid combination was found from the clothes currently available. Try adding more categories." }, { status: 422 });
    return NextResponse.json({ outfits }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("LOOKU stylist error", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "The AI stylist is temporarily unavailable. Check the AI Gateway connection in Vercel, then try again." }, { status: 503 });
  }
}
