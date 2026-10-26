import { generateText } from "ai";
import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const requestSchema = z.object({ imagePath: z.string().min(3).max(500), suggestedName: z.string().max(100).optional() });
const attributesSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(["Tops","Bottoms","Shoes","Outerwear","Dresses","Accessories","Activewear","Sleepwear","Bags","Other"]),
  colors: z.array(z.string().max(30)).max(5),
  pattern: z.string().max(60),
  formality: z.number().int().min(1).max(10),
  seasons: z.array(z.enum(["hot","mild","cold","rainy","all-season"])).max(5),
  style_tags: z.array(z.string().max(35)).max(8),
  description: z.string().max(240),
});
function parseJson(text: string) {
  const from = text.indexOf("{"), to = text.lastIndexOf("}");
  if (from < 0 || to <= from) throw new Error("No JSON object returned");
  return JSON.parse(text.slice(from, to + 1));
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to process wardrobe images." }, { status: 401 });
    const parsedBody = requestSchema.safeParse(await request.json());
    if (!parsedBody.success) return NextResponse.json({ error: "The image path was invalid." }, { status: 400 });
    if (!parsedBody.data.imagePath.startsWith(user.id + "/")) return NextResponse.json({ error: "You can only process images in your own wardrobe folder." }, { status: 403 });
    const { data: allowed, error: quotaError } = await supabase.rpc("consume_ai_quota", { p_daily_limit: 20 });
    if (quotaError) return NextResponse.json({ error: "AI usage controls are not ready. Apply the database migration first." }, { status: 503 });
    if (!allowed) return NextResponse.json({ error: "Today's AI allowance has been used. You can still add this garment manually." }, { status: 429 });

    const { data: file, error: downloadError } = await supabase.storage.from("wardrobe-private").download(parsedBody.data.imagePath);
    if (downloadError || !file) return NextResponse.json({ error: "Could not access the uploaded image." }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Image must be under 10 MB." }, { status: 413 });
    const image = new Uint8Array(await file.arrayBuffer());
    const mimeType = file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
    const prompt = "Identify the single main clothing item in this photo for a private digital wardrobe. If there are multiple pieces, identify the clearest primary garment. Do not claim exact fabric or brand without visual evidence. Use conservative attributes. Formality is 1 (sleepwear/gym) to 10 (formal occasion). Return JSON only with keys name,category,colors,pattern,formality,seasons,style_tags,description. Allowed categories: Tops,Bottoms,Shoes,Outerwear,Dresses,Accessories,Activewear,Sleepwear,Bags,Other. Allowed seasons: hot,mild,cold,rainy,all-season. Suggested user name: " + (parsedBody.data.suggestedName || "none") + ".";
    const result = await generateText({ model: process.env.LOOKU_AI_MODEL || "google/gemini-2.5-flash", messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image", image, mediaType: mimeType }] }], temperature: 0.15, maxOutputTokens: 650 });
    const attrs = attributesSchema.safeParse(parseJson(result.text));
    if (!attrs.success) return NextResponse.json({ error: "We couldn't confidently classify that image. You can keep the garment and edit its details manually." }, { status: 502 });
    return NextResponse.json({ attributes: attrs.data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("LOOKU garment analysis error", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Automatic tagging is unavailable. You can still save the garment manually; check the AI Gateway connection." }, { status: 503 });
  }
}
