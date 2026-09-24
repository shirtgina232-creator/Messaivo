import { clerkMiddleware } from "@clerk/nextjs/server";

// Auth protection is handled in src/app/app/layout.tsx via auth.protect()
export const proxy = clerkMiddleware();

export const config = {
  matcher: [
    // Exclude the Meta OAuth callback from Clerk middleware.
    // Facebook's redirect-back arrives with Referer: www.facebook.com, which triggers
    // Clerk's shouldForceHandshakeForCrossDomain — the middleware intercepts the request
    // before the route handler runs, permanently breaking the OAuth code exchange.
    // The callback validates identity through a signed state cookie (set at initiation)
    // instead of Clerk's auth(), so it does not need the Clerk middleware.
    "/((?!_next/static|_next/image|favicon\\.svg|.*\\.png$|api/auth/meta/callback|auth/relay).*)",
  ],
};
