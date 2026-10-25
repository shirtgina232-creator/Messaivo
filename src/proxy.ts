import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Minimal passthrough proxy — auth is enforced in layouts and route handlers via session cookies.
// The Meta OAuth callback is excluded so Facebook's cross-origin redirect reaches the handler
// without interference (identity verified through HMAC-signed state instead).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.svg|.*\\.png$|api/auth/meta/callback|auth/relay).*)",
  ],
};
