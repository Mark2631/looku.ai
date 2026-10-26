import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const applicationSchema = z.object({
  brand_name: z.string().trim().min(2).max(120),
  contact_email: z.string().email().max(200),
  website: z.string().url().refine(v => v.startsWith("https://"), "Website must use HTTPS"),
  notes: z.string().trim().max(1200).optional(),
});
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to submit a merchant application." }, { status: 401 });
  const parsed = applicationSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Check the brand, contact email and HTTPS website." }, { status: 400 });
  const { data, error } = await supabase.from("merchant_applications").insert({ ...parsed.data, user_id: user.id }).select("id,status,created_at").single();
  if (error) return NextResponse.json({ error: "Could not submit the application." }, { status: 500 });
  return NextResponse.json({ application: data }, { status: 201 });
}
