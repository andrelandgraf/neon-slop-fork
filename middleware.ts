import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Lightweight auth guard. Better Auth's `getSessionCookie` checks
 * the signed cookie *without* a DB round-trip — perfect for the
 * edge runtime. If the cookie is missing, redirect to /login with
 * a `next` parameter so the post-login flow returns the user to the
 * URL they were trying to hit.
 *
 * The page-level `requireTenant()` does a real DB lookup, so any
 * forged / tampered cookie still gets booted there.
 */
export function middleware(req: NextRequest) {
  const cookie = getSessionCookie(req);
  if (cookie) return NextResponse.next();
  const url = req.nextUrl.clone();
  const next = url.pathname + (url.search || "");
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/projects/:path*"],
};
