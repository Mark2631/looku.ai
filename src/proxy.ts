import { NextResponse, type NextRequest } from "next/server";

/**
 * LOOKU is currently a guest-first, device-local app.
 * No Supabase session refresh or authentication gate is needed on app routes.
 */
export function proxy(request: NextRequest) {
  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
