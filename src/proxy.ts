import { clerkMiddleware } from "@clerk/nextjs/server";

// Auth protection is handled in src/app/app/layout.tsx via auth.protect()
// Diagnostic handler logs auth state for /app/pages requests to trace the
// Facebook OAuth → Clerk session recognition failure.
// TODO: remove after Facebook Connect flow is confirmed working.
export const proxy = clerkMiddleware(async (auth, req) => {
  if (new URL(req.url).pathname.startsWith("/app/pages")) {
    const a = await auth();
    const referer = req.headers.get("referer") ?? "none";
    const secFetchDest = req.headers.get("sec-fetch-dest") ?? "none";
    const refererHost = (() => {
      try { return new URL(referer).hostname; } catch { return referer; }
    })();
    console.log("[proxy] /app/pages auth diagnostic", {
      hasUserId: !!(a as { userId?: string | null }).userId,
      sessionStatus: (a as { sessionStatus?: string | null }).sessionStatus ?? "unknown",
      refererHost,
      secFetchDest,
    });
  }
});

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
