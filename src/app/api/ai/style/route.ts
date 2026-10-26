import { generateText } from "ai";
import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getResearchPrompt } from "@/lib/style-research";

export const runtime = "nodejs";
const requestSchema = z.object({
  occasion: z.string().trim().min(1).max(80).default("Everyday"),
  prompt: z.string().trim().max(1000).default("Choose a good outfit for me."),
  count: z.number().int().min(1).max(3).default(3),
  context: z.object({
    weather: z.object({
      tempC: z.number().min(-80).max(70),
      feelsLikeC: z.number().min(-80).max(70),
      condition: z.string().max(100),
      windKph: z.number().min(0).max(500),
      precipitationMm: z.number().min(0).max(2000),
    }).optional(),
    upcomingEvents: z.array(z.object({ title: z.string().max(120), start: z.string().max(80) })).max(5).optional(),
  }).optional(),
});
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

    const { data: items, error: itemsError } = await supabase.from("wardrobe_items").select("id,name,brand,category,colors,pattern,formality,seasons,style_tags,status,attributes").eq("user_id", user.id).eq("is_owned", true).eq("status", "available").limit(120);
    if (itemsError) return NextResponse.json({ error: "Couldn't read your wardrobe. Please try again." }, { status: 500 });
    if (!items || items.length < 2) return NextResponse.json({ error: "Add at least two available wardrobe items before generating an outfit." }, { status: 422 });

    const { data: allowed, error: quotaError } = await supabase.rpc("consume_ai_quota");
    if (quotaError) return NextResponse.json({ error: "AI usage controls are not ready. Apply the LOOKU database migration before using the stylist." }, { status: 503 });
    if (!allowed) return NextResponse.json({ error: "You've reached today's AI styling limit of 20 operations. Your saved wardrobe is still available; try again tomorrow." }, { status: 429 });


    const [profileResult, feedbackResult, wornResult] = await Promise.all([
      supabase.from("profiles").select("style_preferences").eq("id", user.id).maybeSingle(),
      supabase.from("outfit_feedback").select("reaction,reasons,note,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(25),
      supabase.from("outfits").select("id,title,occasion,worn_at").eq("user_id", user.id).eq("status", "worn").not("worn_at", "is", null).order("worn_at", { ascending: false }).limit(10),
    ]);
    const wornOutfitIds = (wornResult.data || []).map(o => o.id);
    const wornLinks = wornOutfitIds.length
      ? await supabase.from("outfit_items").select("outfit_id,wardrobe_item_id").eq("user_id", user.id).in("outfit_id", wornOutfitIds)
      : { data: [] as { outfit_id: string; wardrobe_item_id: string }[] };
    const recentlyWornItemIds = Array.from(new Set((wornLinks.data || []).map(link => link.wardrobe_item_id)));
    const recentlyWornItems = recentlyWornItemIds.map(id => items.find(item => item.id === id)).filter(Boolean).map(item => ({ id: item!.id, name: item!.name, category: item!.category }));
    const preferences = profileResult.data?.style_preferences || {};
    const feedback = (feedbackResult.data || []).map(entry => ({ reaction: entry.reaction, reasons: entry.reasons, note: entry.note })).slice(0, 20);

    const prompt = [
      "You are LOOKU, a careful personal stylist. Build outfits ONLY from the wardrobe items supplied below.",
      "Do not invent item IDs, brands, garments, body measurements, weather or event information. Every outfit must use at least two different supplied item IDs and at most six.",
      "A complete outfit must include a top and a bottom, or a dress with appropriate shoes. For beach/pool contexts, swimwear may be the core garment with available shoes, cover-ups or accessories as practical. If the user owns available shoes, include footwear when practical. Never repeat a garment ID within one outfit.",
      "Use category logic, color balance, pattern balance, occasion formality, season suitability, comfort and the user request. Respect explicit accessibility, modesty, fit, climate and personal constraints. Avoid claiming physical fit or fabric properties not present in the attributes.",
      getResearchPrompt(),
      "Use a supplied weather context only as a current-condition signal. Never infer a forecast from current conditions. If no weather is supplied, do not mention exact temperature or precipitation.",
      "Use supplied calendar titles only to infer likely occasion context; titles can be ambiguous, so do not reveal or repeat private event details unnecessarily.",
      "Respect the user's saved preferences and recent feedback. Prefer variety over repeating pieces worn in the last few recorded looks, unless the user explicitly asks to reuse them. Feedback represents personal preference, not a universal fashion rule.",
      "Return exactly the requested number where possible, otherwise return fewer strong options. Avoid near-duplicate alternatives. Keep reasons specific and plain-language.",
      "Return valid JSON only: {\"outfits\":[{\"title\":\"...\",\"style\":\"...\",\"reason\":\"...\",\"itemIds\":[\"uuid\",\"uuid\"],\"confidenceNote\":\"...\"}]}",
      "Requested occasion: " + body.data.occasion,
      "Context data explicitly provided for this styling request: " + JSON.stringify(body.data.context || {}),
      "User instruction: " + body.data.prompt,
      "Saved personal style profile: " + JSON.stringify(preferences),
      "Recent user feedback (newest first): " + JSON.stringify(feedback),
      "Items used in recently worn looks, avoid repeating unless requested: " + JSON.stringify(recentlyWornItems),
      "Requested options: " + body.data.count,
      "User wardrobe (IDs are the only allowed item references): " + JSON.stringify(items)
    ].join("\n\n");
    const result = await generateText({ model: process.env.LOOKU_AI_MODEL || "google/gemini-3.1-flash-lite", prompt, temperature: 0.35, maxOutputTokens: 1500 });
    const parsed = resultSchema.safeParse(parseJson(result.text));
    if (!parsed.success) return NextResponse.json({ error: "The stylist returned a result we couldn't validate. Try a more specific occasion." }, { status: 502 });
    const validIds = new Set(items.map(item => item.id));
    const categoriesById = new Map(items.map(item => [item.id, item.category]));
    const availableShoesExist = items.some(item => item.category === "Shoes");
    const isSwimOccasion = /\b(beach|pool|swim|swimming)\b/i.test(body.data.occasion + " " + body.data.prompt);
    const outfits = parsed.data.outfits.map(outfit => ({ ...outfit, itemIds: Array.from(new Set(outfit.itemIds)).filter(id => validIds.has(id)) }))
      .filter(outfit => {
        if (outfit.itemIds.length < 2) return false;
        const outfitCategories = outfit.itemIds.map(id => categoriesById.get(id));
        const hasDress = outfitCategories.includes("Dresses");
        const hasTop = outfitCategories.includes("Tops");
        const hasBottom = outfitCategories.includes("Bottoms");
        const hasSwimwear = outfitCategories.includes("Swimwear");
        const hasShoes = outfitCategories.includes("Shoes");
        const hasCompleteCore = hasDress || (hasTop && hasBottom) || (isSwimOccasion && hasSwimwear);
        return hasCompleteCore && (!availableShoesExist || hasShoes);
      });
    if (!outfits.length) return NextResponse.json({ error: "I couldn't form a complete outfit with the clothes marked available. Add a top and bottom, a dress, or swimwear for a beach/pool occasion, plus suitable available footwear where needed." }, { status: 422 });
    return NextResponse.json({ outfits }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("LOOKU stylist error", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "The AI stylist is temporarily unavailable. Check the AI Gateway connection in Vercel, then try again." }, { status: 503 });
  }
}
