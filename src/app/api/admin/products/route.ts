import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
const productSchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(1500).optional().nullable(),
  category: z.string().trim().min(1).max(60).default("Other"),
  brand: z.string().trim().max(120).optional().nullable(),
  merchant: z.string().trim().min(2).max(120),
  currency: z.string().trim().length(3).default("KES"),
  price: z.number().nonnegative().max(100000000).optional().nullable(),
  image_url: z.string().url().refine(v => v.startsWith("https://"), "Image must use HTTPS").optional().nullable(),
  product_url: z.string().url().refine(v => v.startsWith("https://"), "Product link must use HTTPS"),
  affiliate_url: z.string().url().refine(v => v.startsWith("https://"), "Affiliate link must use HTTPS").optional().nullable(),
  country_code: z.array(z.string().length(2)).default(["KE"]),
  sizes: z.array(z.string().max(20)).max(40).default([]),
  is_active: z.boolean().default(false),
  is_approved: z.boolean().default(false),
  source: z.string().trim().min(2).max(50).default("merchant"),
});
async function adminClient() {
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  const allowlist = (process.env.LOOKU_ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  if (!user?.email || !allowlist.includes(user.email.toLowerCase())) return { error: NextResponse.json({ error: "Not authorized." }, { status: 403 }) };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { error: NextResponse.json({ error: "Admin data access is not configured. Set the server-only service key." }, { status: 503 }) };
  return { client: createSupabaseClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }) };
}

export async function GET() {
  const result = await adminClient();
  if ("error" in result) return result.error;
  const { data, error } = await result.client.from("products").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: "Couldn't load the catalog." }, { status: 500 });
  return NextResponse.json({ products: data }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: NextRequest) {
  const result = await adminClient();
  if ("error" in result) return result.error;
  const parsed = productSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Check the product fields and HTTPS URLs." }, { status: 400 });
  const { data, error } = await result.client.from("products").insert(parsed.data).select("*").single();
  if (error) return NextResponse.json({ error: "Couldn't create the product. Check the database migration." }, { status: 500 });
  return NextResponse.json({ product: data }, { status: 201 });
}
export async function PATCH(request: NextRequest) {
  const result = await adminClient();
  if ("error" in result) return result.error;
  const body = await request.json();
  const id = z.string().uuid().safeParse(body.id);
  if (!id.success) return NextResponse.json({ error: "Product ID is invalid." }, { status: 400 });
  const parsed = productSchema.partial().safeParse(body.changes);
  if (!parsed.success || !Object.keys(parsed.data || {}).length) return NextResponse.json({ error: "No valid product changes supplied." }, { status: 400 });
  const { data, error } = await result.client.from("products").update({ ...parsed.data, updated_at: new Date().toISOString() }).eq("id", id.data).select("*").single();
  if (error) return NextResponse.json({ error: "Couldn't update the product." }, { status: 500 });
  return NextResponse.json({ product: data });
}
export async function DELETE(request: NextRequest) {
  const result = await adminClient();
  if ("error" in result) return result.error;
  const id = z.string().uuid().safeParse(new URL(request.url).searchParams.get("id"));
  if (!id.success) return NextResponse.json({ error: "Product ID is invalid." }, { status: 400 });
  const { error } = await result.client.from("products").delete().eq("id", id.data);
  if (error) return NextResponse.json({ error: "Couldn't delete the product." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
