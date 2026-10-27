import { NextResponse, type NextRequest } from "next/server";
import { createClient as serviceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
export const runtime="nodejs";
async function getAdmin(){
 const client=await createClient();
 const {data:{user}}=await client.auth.getUser();
 const allowed=(process.env.LOOKU_ADMIN_EMAILS||"").split(",").map(e=>e.trim().toLowerCase()).filter(Boolean);
 if(!user?.email||!allowed.includes(user.email.toLowerCase()))return null;
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return null;
 return serviceClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function GET(){
 const admin=await getAdmin();if(!admin)return NextResponse.json({error:"Moderation permissions not configured."},{status:403});
 const [posts,reports]=await Promise.all([
  admin.from("community_posts").select("id,user_id,display_name,caption,occasion,public_image_path,visibility,created_at").order("created_at",{ascending:false}).limit(150),
  admin.from("community_reports").select("id,post_id,reason,reporter_id,created_at").order("created_at",{ascending:false}).limit(300)
 ]);
 if(posts.error||reports.error)return NextResponse.json({error:"Could not load moderation queue."},{status:500});
 return NextResponse.json({posts:posts.data,reports:reports.data},{headers:{"Cache-Control":"no-store"}});
}
export async function PATCH(request:NextRequest){
 const origin=request.headers.get("origin"),host=request.headers.get("x-forwarded-host")||request.headers.get("host");
 if(origin&&host&&new URL(origin).host!==host)return NextResponse.json({error:"Cross-site writes denied."},{status:403});
 const admin=await getAdmin();if(!admin)return NextResponse.json({error:"Moderation permissions not configured."},{status:403});
 const parsed=z.object({postId:z.string().uuid(),action:z.enum(["hide","restore"])}).safeParse(await request.json());
 if(!parsed.success)return NextResponse.json({error:"Invalid moderation request."},{status:400});
 const {data:post,error:getError}=await admin.from("community_posts").select("id,public_image_path").eq("id",parsed.data.postId).single();
 if(getError||!post)return NextResponse.json({error:"Post not found."},{status:404});
 const visibility=parsed.data.action==="hide"?"hidden":"public";
 const {error}=await admin.from("community_posts").update({visibility}).eq("id",parsed.data.postId);
 if(error)return NextResponse.json({error:"Could not moderate post."},{status:500});
 if(visibility==="hidden"&&post.public_image_path){
   await admin.storage.from("looku-community").remove([post.public_image_path]);
   await admin.from("community_posts").update({public_image_path:null}).eq("id",parsed.data.postId);
 }
 return NextResponse.json({ok:true,visibility});
}
