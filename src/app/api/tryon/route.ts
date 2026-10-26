import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const schema = z.object({
  wardrobeItemId: z.string().uuid(),
  modelImagePath: z.string().min(5).max(500),
  prompt: z.string().trim().max(180).optional().default(""),
});

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (origin && host) {
    try { if (new URL(origin).host !== host) return NextResponse.json({ error: "Cross-origin try-on requests are not allowed." }, { status: 403 }); }
    catch { return NextResponse.json({ error: "Invalid request origin." }, { status: 403 }); }
  }

  const session = await createClient();
  const { data: { user }, error: authError } = await session.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in before using the virtual fitting room." }, { status: 401 });
  if (!process.env.FASHN_API_KEY) return NextResponse.json({ error: "Virtual try-on is not activated yet. Add FASHN_API_KEY to the LOOKU Vercel environment after choosing a provider plan." }, { status: 503 });
  const admin = adminClient();
  if (!admin) return NextResponse.json({ error: "Try-on job storage is not configured. No image was sent to the provider." }, { status: 503 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid wardrobe item and personal photo." }, { status: 400 });
  const imagePath = parsed.data.modelImagePath;
  if (!imagePath.startsWith(user.id + "/tryon/")) return NextResponse.json({ error: "The personal photo must be uploaded to your own try-on folder." }, { status: 403 });

  const [itemResult, photoResult] = await Promise.all([
    session.from("wardrobe_items").select("id,user_id,name,image_path,status,is_owned").eq("id", parsed.data.wardrobeItemId).eq("user_id", user.id).maybeSingle(),
    session.storage.from("wardrobe-private").download(imagePath),
  ]);
  const item = itemResult.data;
  if (itemResult.error || !item || !item.is_owned || item.status !== "available" || !item.image_path) {
    return NextResponse.json({ error: "Choose a garment you own, with an image, that is marked available." }, { status: 422 });
  }
  const photo = photoResult.data;
  if (photoResult.error || !photo) return NextResponse.json({ error: "Could not read your uploaded photo. Please upload it again." }, { status: 400 });
  if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type) || photo.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Use a JPG, PNG or WebP personal photo smaller than 10 MB." }, { status: 413 });
  }

  const { data: quotaAllowed, error: quotaError } = await session.rpc("consume_tryon_quota", { p_daily_limit: 2 });
  if (quotaError) return NextResponse.json({ error: "Try-on quota controls are not ready. Apply the virtual try-on migration before starting a job." }, { status: 503 });
  if (!quotaAllowed) return NextResponse.json({ error: "You've reached the current limit of two try-on generations per day. This helps protect your credit balance." }, { status: 429 });

  const [{ data: personSigned, error: personUrlError }, { data: garmentSigned, error: garmentUrlError }] = await Promise.all([
    session.storage.from("wardrobe-private").createSignedUrl(imagePath, 600),
    session.storage.from("wardrobe-private").createSignedUrl(item.image_path, 600),
  ]);
  if (personUrlError || garmentUrlError || !personSigned?.signedUrl || !garmentSigned?.signedUrl) {
    return NextResponse.json({ error: "Couldn't create private, short-lived image links. No provider request was sent." }, { status: 500 });
  }

  const { data: job, error: jobError } = await admin.from("tryon_jobs").insert({
    user_id: user.id,
    wardrobe_item_id: item.id,
    model_image_path: imagePath,
    status: "starting",
    generation_mode: "fast",
    resolution: "1k",
  }).select("id").single();
  if (jobError || !job) return NextResponse.json({ error: "Couldn't create a secure try-on job. No provider request was sent." }, { status: 500 });

  try {
    const response = await fetch("https://api.fashn.ai/v1/run", {
      method: "POST",
      headers: { "Authorization": "Bearer " + process.env.FASHN_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model_name: "tryon-max",
        inputs: {
          model_image: personSigned.signedUrl,
          product_image: garmentSigned.signedUrl,
          prompt: parsed.data.prompt || "",
          generation_mode: "fast",
          resolution: "1k",
          num_images: 1,
          output_format: "jpeg",
          return_base64: true,
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const data = await response.json() as { id?: string; error?: { message?: string } | string };
    if (!response.ok || !data.id) {
      await admin.from("tryon_jobs").update({ status: "failed", error_message: "The try-on provider rejected this request." }).eq("id", job.id).eq("user_id", user.id);
      return NextResponse.json({ error: "The virtual fitting service rejected this request. Check its credit balance and image requirements." }, { status: 502 });
    }
    const { error: updateError } = await admin.from("tryon_jobs").update({ provider_job_id: data.id, status: "queued" }).eq("id", job.id).eq("user_id", user.id);
    if (updateError) return NextResponse.json({ error: "The provider accepted the job, but LOOKU couldn't track it safely. Contact support before retrying to avoid duplicate credits." }, { status: 500 });
    return NextResponse.json({ jobId: job.id, status: "queued", garmentName: item.name, note: "Try-on images are sent to FASHN only after you start this job. Generated previews are illustrative, not size or fit guarantees." }, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch {
    await admin.from("tryon_jobs").update({ status: "failed", error_message: "Provider request timed out." }).eq("id", job.id).eq("user_id", user.id);
    return NextResponse.json({ error: "The provider request timed out. Check job history before trying again." }, { status: 502 });
  }
}
