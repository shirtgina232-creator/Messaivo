/**
 * Canonical OAuth callback URL for the Meta Facebook Login integration.
 *
 * Why this exists as a separate module:
 * - The redirect_uri sent to Meta on initiation must EXACTLY match the redirect_uri
 *   sent to Meta on token exchange. Any mismatch causes OAuthException error=100.
 * - NEXT_PUBLIC_APP_URL is baked into the client bundle at build time and is NOT
 *   available as a reliable runtime server env var on Vercel if it was not set in
 *   the Vercel dashboard at build time.
 * - The apex domain (messaivo.com) does a 308 redirect to www.messaivo.com; using
 *   the apex as redirect_uri causes a Meta "redirect_uri does not match" error.
 *
 * Solution: use a server-only APP_URL env var (no NEXT_PUBLIC_ prefix, read at
 * runtime), with a hardcoded production default so the OAuth flow never falls back
 * to a wrong host even if the env var is absent from Vercel.
 */

export const META_CALLBACK_PATH = "/api/auth/meta/callback";

/**
 * Returns the absolute callback URL Meta will redirect the user's browser to
 * after OAuth authorization.
 *
 * - Production: always https://www.messaivo.com/api/auth/meta/callback
 *   (override with APP_URL env var if the domain ever changes)
 * - Development: derived from the incoming request URL so it works on any local port
 */
export function metaCallbackUrl(req: Request): string {
  if (process.env.NODE_ENV === "production") {
    const base = (process.env.APP_URL ?? "https://www.messaivo.com").replace(/\/+$/, "");
    return `${base}${META_CALLBACK_PATH}`;
  }
  // Development: use the actual request origin so any dev port works
  const { protocol, host } = new URL(req.url);
  return `${protocol}//${host}${META_CALLBACK_PATH}`;
}
