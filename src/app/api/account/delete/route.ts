import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { decryptCalendarToken } from "@/lib/calendar-crypto";

export const runtime = "nodejs";

async function listAllObjectPaths(client: SupabaseClient, bucket: string, basePath: string): Promise<string[]> {
  const found: string[] = [];
  async function walk(path: string): Promise<void> {
    let offset = 0;
    while (true) {
      const { data, error } = await client.storage.from(bucket).list(path, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw new Error("Could not enumerate account files in " + bucket + " for deletion.");
      const entries = data || [];
      for (const entry of entries) {
        const next = path ? path + "/" + entry.name : entry.name;
        if (entry.id === null) await walk(next);
        else found.push(next);
      }
      if (entries.length < 100) break;
      offset += entries.length;
    }
  }
  await walk(basePath);
  return found;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (origin && host) {
    try { if (new URL(origin).host !== host) return NextResponse.json({ error: "Cross-origin account deletion is not allowed." }, { status: 403 }); }
    catch { return NextResponse.json({ error: "Invalid request origin." }, { status: 403 }); }
  }
  const session = await createClient();
  const { data: { user }, error: authError } = await session.auth.getUser();
  if (authError || !user?.email) return NextResponse.json({ error: "Sign in again before deleting your account." }, { status: 401 });
  const parsed = z.object({ confirmationEmail: z.string().email() }).safeParse(await request.json());
  if (!parsed.success || parsed.data.confirmationEmail.toLowerCase() !== user.email.toLowerCase()) return NextResponse.json({ error: "Enter the email address on your account to confirm deletion." }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Account deletion is not configured yet. Set the server-only service key; no records were deleted." }, { status: 503 });

  const admin = createSupabaseClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { data: calendarConnection } = await admin.from("calendar_connections").select("refresh_token_encrypted").eq("user_id", user.id).maybeSingle();
    if (calendarConnection?.refresh_token_encrypted && process.env.CALENDAR_TOKEN_ENCRYPTION_KEY) {
      try {
        const refreshToken = decryptCalendarToken(calendarConnection.refresh_token_encrypted);
        await fetch("https://oauth2.googleapis.com/revoke?token=" + encodeURIComponent(refreshToken), { method: "POST", signal: AbortSignal.timeout(4000) }).catch(() => undefined);
      } catch { /* Continue deleting local data; Google access can be revoked in Google Account security if provider revocation fails. */ }
    }
    // Delete public community media as well as private closet images before removing the account.
    // Public uploads are explicit and live in a separate bucket, so cascade-delete alone is insufficient.
    for (const bucket of ["looku-community", "wardrobe-private"]) {
      const paths = await listAllObjectPaths(admin, bucket, user.id);
      for (let i = 0; i < paths.length; i += 100) {
        const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
        if (error) throw new Error("Could not remove all account photos from " + bucket + ". Account deletion was stopped; contact support.");
      }
    }
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw new Error("Private photos were cleared, but account removal failed. Please contact support before retrying.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Account deletion failed safely." }, { status: 500 });
  }
}
