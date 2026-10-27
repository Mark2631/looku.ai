import { generateText } from "ai";
import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const pieceSchema=z.object({
  name:z.string().trim().min(2).max(100),
  category:z.enum(["Tops","Bottoms","Shoes","Outerwear","Dresses","Swimwear","Accessories","Activewear","Sleepwear","Bags","Other"]),
  colors:z.array(z.string().max(30)).max(3),
  description:z.string().max(200).optional(),
});
const outputSchema=z.object({pieces:z.array(pieceSchema).max(8)});
const MAX_BYTES=3_500_000;
function parseJson(value:string){
  const from=value.indexOf("{"),to=value.lastIndexOf("}");
  if(from<0||to<=from)throw new Error("Invalid model response");
  return JSON.parse(value.slice(from,to+1));
}

export async function POST(request:NextRequest){
  const {data:{user},error:authError}=await (await createClient()).auth.getUser();
  if(authError||!user)return NextResponse.json({error:"Sign in to scan an outfit photo."},{status:401});
  const size=Number(request.headers.get("content-length")||"0");
  if(size>4_000_000)return NextResponse.json({error:"Photo request is too large. Use a photo under 3.5 MB."},{status:413});
  try{
    const data=await request.formData();
    const image=data.get("photo");
    if(!(image instanceof File))return NextResponse.json({error:"Choose an outfit photo first."},{status:400});
    if(image.size<500||image.size>MAX_BYTES)return NextResponse.json({error:"Choose a clear photo under 3.5 MB."},{status:413});
    if(!["image/jpeg","image/png","image/webp"].includes(image.type))return NextResponse.json({error:"Use JPG, PNG or WebP."},{status:415});
    const supabase=await createClient();
    const {data:allowed,error:quotaError}=await supabase.rpc("consume_ai_quota");
    if(quotaError)return NextResponse.json({error:"AI usage controls are unavailable."},{status:503});
    if(!allowed)return NextResponse.json({error:"Today's AI allowance has been reached. Use Quick Closet instead."},{status:429});
    const bytes=new Uint8Array(await image.arrayBuffer());
    const prompt=[
      "LOOKU private outfit scan. Identify at most eight distinct, visually identifiable wearable clothing pieces in this single photo.",
      "Return JSON only: {\"pieces\":[{\"name\":\"...\",\"category\":\"...\",\"colors\":[\"...\"],\"description\":\"...\"}]}",
      "Allowed categories: Tops,Bottoms,Shoes,Outerwear,Dresses,Swimwear,Accessories,Activewear,Sleepwear,Bags,Other.",
      "If clothes are hidden or unidentifiable, omit them. Do not infer gender, race, body measurements, exact fabric, brand, price, ownership or physical fit.",
      "A dress is one piece. A top and bottom are different pieces. Do not duplicate the same visual item.",
      "The user must review and confirm which pieces they own before any wardrobe record is saved. The image is not stored by LOOKU."
    ].join("\n");
    const answer=await generateText({
      model:process.env.LOOKU_AI_MODEL||"google/gemini-3.1-flash-lite",
      messages:[{role:"user",content:[{type:"text",text:prompt},{type:"image",image:bytes,mediaType:image.type as "image/jpeg"|"image/png"|"image/webp"}]}],
      maxOutputTokens:950,temperature:0.1
    });
    const output=outputSchema.safeParse(parseJson(answer.text));
    if(!output.success)return NextResponse.json({error:"Could not reliably separate the garments. Try a clearer picture or use Quick Closet."},{status:422});
    return NextResponse.json({pieces:output.data.pieces,requiresOwnershipConfirmation:true,notice:"Review and confirm ownership. No garments have been saved and LOOKU does not retain the scan photo."},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("LOOKU outfit scan error",error instanceof Error?error.message:"Unknown error");
    return NextResponse.json({error:"Multi-garment AI analysis is unavailable. You can add wardrobe basics without AI."},{status:503});
  }
}
