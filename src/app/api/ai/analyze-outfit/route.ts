import { generateText } from "ai";
import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const requestSchema = z.object({ imagePath: z.string().min(3).max(500) });
const pieceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  category: z.enum(["Tops","Bottoms","Shoes","Outerwear","Dresses","Swimwear","Accessories","Activewear","Sleepwear","Bags","Other"]),
  colors: z.array(z.string().max(30)).max(3),
  description: z.string().max(200).optional(),
});
const outputSchema = z.object({ pieces: z.array(pieceSchema).max(8) });

function parseJson(text:string) {
  const a=text.indexOf("{"), b=text.lastIndexOf("}");
  if(a<0||b<=a)throw new Error("Invalid model response");
  return JSON.parse(text.slice(a,b+1));
}
export async function POST(request:NextRequest) {
  try {
    const supabase=await createClient();
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(authError||!user)return NextResponse.json({error:"Sign in to scan an outfit photo."},{status:401});
    const parsed=requestSchema.safeParse(await request.json());
    if(!parsed.success||!parsed.data.imagePath.startsWith(user.id+"/outfit-scan/")){
      return NextResponse.json({error:"Use a private outfit scan belonging to your account."},{status:403});
    }
    const {data:photo,error:downloadError}=await supabase.storage.from("wardrobe-private").download(parsed.data.imagePath);
    if(downloadError||!photo)return NextResponse.json({error:"Could not load your photo."},{status:400});
    if(photo.size>10*1024*1024)return NextResponse.json({error:"Outfit photos must be under 10 MB."},{status:413});
    if(!["image/jpeg","image/png","image/webp"].includes(photo.type))return NextResponse.json({error:"Use a JPG, PNG or WebP image."},{status:415});
    const {data:allowed,error:quotaError}=await supabase.rpc("consume_ai_quota");
    if(quotaError)return NextResponse.json({error:"AI usage controls are unavailable."},{status:503});
    if(!allowed)return NextResponse.json({error:"Today's AI allowance has been reached. Use the quick closet instead."},{status:429});
    const bytes=new Uint8Array(await photo.arrayBuffer());
    const prompt=[
      "LOOKU private wardrobe scan. Identify at most eight distinct, visually identifiable wearable garment pieces in this single photo.",
      "Return JSON only: {\"pieces\":[{\"name\":\"...\",\"category\":\"...\",\"colors\":[\"...\"],\"description\":\"...\"}]}",
      "Allowed categories: Tops,Bottoms,Shoes,Outerwear,Dresses,Swimwear,Accessories,Activewear,Sleepwear,Bags,Other.",
      "If clothing is hidden or unidentifiable, do not guess. Do not infer gender, race, body measurements, brand, price, ownership or fit.",
      "A full outfit photo can contain top, trousers/skirt, shoes, outerwear and bag. A dress is one category, not both a top and a bottom.",
      "Describe only visible properties. Users will confirm which pieces they own before saving. Do not include the person as a wardrobe item."
    ].join("\n");
    const result=await generateText({
      model:process.env.LOOKU_AI_MODEL||"google/gemini-3.1-flash-lite",
      messages:[{role:"user",content:[{type:"text",text:prompt},{type:"image",image:bytes,mediaType:photo.type as "image/jpeg"|"image/png"|"image/webp"}]}],
      maxOutputTokens:950,temperature:0.1
    });
    const output=outputSchema.safeParse(parseJson(result.text));
    if(!output.success)return NextResponse.json({error:"Couldn't confidently separate the garments. Try a clearer photo or use Quick Closet."},{status:422});
    return NextResponse.json({pieces:output.data.pieces,requiresOwnershipConfirmation:true,notice:"Review each garment and confirm you own it. No items have been saved yet."},{headers:{"Cache-Control":"no-store"}});
  } catch(e) {
    console.error("LOOKU outfit scan failed",e instanceof Error?e.message:"Unknown error");
    return NextResponse.json({error:"Multi-item photo recognition is unavailable. You can still select wardrobe basics without AI."},{status:503});
  }
}
