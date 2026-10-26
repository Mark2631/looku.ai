import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signedResult(admin: ReturnType<typeof adminClient>, path: string) {
  if (!admin) return null;
  const { data } = await admin.storage.from("wardrobe-private").createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}

export async function GET(request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  const session = await createClient();
  const { data: { user }, error: authError } = await session.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to check this fitting-room job." }, { status: 401 });
  const admin = adminClient();
  if (!admin) return NextResponse.json({ error: "Try-on job storage is not configured." }, { status: 503 });
  const { jobId } = await context.params;
  const jobIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!jobIdPattern.test(jobId)) return NextResponse.json({ error: "Invalid try-on job identifier." }, { status: 400 });

  const { data: job, error: jobError } = await admin.from("tryon_jobs").select("*").eq("id", jobId).eq("user_id", user.id).maybeSingle();
  if (jobError || !job) return NextResponse.json({ error: "Try-on job not found." }, { status: 404 });
  if (job.status === "completed" && job.result_image_path) {
    const resultUrl = await signedResult(admin, job.result_image_path);
    return NextResponse.json({ jobId, status: "completed", resultUrl, creditsUsed: job.credits_used }, { headers: { "Cache-Control": "no-store" } });
  }
  if (job.status === "failed") return NextResponse.json({ jobId, status: "failed", error: job.error_message || "The try-on job failed. Try another photo." }, { headers: { "Cache-Control": "no-store" } });
  if (!job.provider_job_id || !process.env.FASHN_API_KEY) {
    return NextResponse.json({ jobId, status: job.status, error: job.error_message || "Waiting for the try-on provider." }, { status: 202, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const response = await fetch("https://api.fashn.ai/v1/status/" + encodeURIComponent(job.provider_job_id), {
      headers: { "Authorization": "Bearer " + process.env.FASHN_API_KEY },
      cache: "no-store",
      signal: AbortSignal.timeout(9000),
    });
    const provider = await response.json() as { status?: string; output?: string[]; error?: { message?: string } | string };
    const creditHeader = response.headers.get("x-fashn-credits-used");
    const creditsUsed = creditHeader && Number.isFinite(Number(creditHeader)) ? Number(creditHeader) : null;
    if (!response.ok) return NextResponse.json({ jobId, status: job.status, message: "Waiting for provider status." }, { status: 202, headers: { "Cache-Control": "no-store" } });
    if (provider.status === "failed") {
      await admin.from("tryon_jobs").update({ status: "failed", error_message: "The try-on provider couldn't generate a reliable image.", credits_used: creditsUsed }).eq("id", job.id).eq("user_id", user.id);
      return NextResponse.json({ jobId, status: "failed", error: "The try-on provider couldn't generate a reliable image. Try a clear, front-facing photo and a single garment." }, { headers: { "Cache-Control": "no-store" } });
    }
    if (provider.status !== "completed" || !provider.output?.[0]) {
      const nextStatus = provider.status === "processing" ? "processing" : "queued";
      await admin.from("tryon_jobs").update({ status: nextStatus, credits_used: creditsUsed }).eq("id", job.id).eq("user_id", user.id);
      return NextResponse.json({ jobId, status: nextStatus }, { status: 202, headers: { "Cache-Control": "no-store" } });
    }

    const output = provider.output[0];
    let imageBytes: Buffer;
    let contentType = "image/jpeg";
    if (output.startsWith("data:image/")) {
      const match = output.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!match) throw new Error("The provider returned an unsupported image format.");
      contentType = match[1];
      imageBytes = Buffer.from(match[2], "base64");
    } else {
      let remote: URL;
      try { remote = new URL(output); } catch { throw new Error("Provider output URL was invalid."); }
      if (remote.protocol !== "https:" || remote.hostname !== "cdn.fashn.ai") throw new Error("Provider output origin was not trusted.");
      const imageResponse = await fetch(remote, { cache: "no-store", signal: AbortSignal.timeout(12000) });
      if (!imageResponse.ok) throw new Error("Provider output could not be downloaded.");
      contentType = imageResponse.headers.get("content-type")?.split(";")[0] || "image/jpeg";
      if (!["image/jpeg","image/png","image/webp"].includes(contentType)) throw new Error("Provider output was not an image.");
      const arrayBuffer = await imageResponse.arrayBuffer();
      if (arrayBuffer.byteLength > 12 * 1024 * 1024) throw new Error("Provider output exceeded the image size limit.");
      imageBytes = Buffer.from(arrayBuffer);
    }
    if (imageBytes.byteLength === 0 || imageBytes.byteLength > 12 * 1024 * 1024) throw new Error("Provider output exceeded the image size limit.");
    const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const path = user.id + "/tryon-results/" + job.id + "." + ext;
    const { error: storageError } = await admin.storage.from("wardrobe-private").upload(path, imageBytes, { contentType, cacheControl: "3600", upsert: true });
    if (storageError) throw new Error("Could not store the result in private wardrobe storage.");
    const { error: updateError } = await admin.from("tryon_jobs").update({ status: "completed", result_image_path: path, error_message: null, credits_used: creditsUsed }).eq("id", job.id).eq("user_id", user.id);
    if (updateError) {
      await admin.storage.from("wardrobe-private").remove([path]);
      throw new Error("Could not record the result safely.");
    }
    const resultUrl = await signedResult(admin, path);
    return NextResponse.json({ jobId, status: "completed", resultUrl, creditsUsed }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("LOOKU try-on status error", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ jobId, status: job.status, error: "The fitting-room result couldn't be retrieved yet. Retry status or check the provider job later." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
