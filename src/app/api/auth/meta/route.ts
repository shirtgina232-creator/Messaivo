import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createHmac, randomBytes } from "crypto";
import { metaCallbackUrl } from "@/lib/meta-oauth";

/**
 * Build an HMAC-signed state token for the Facebook OAuth flow.
 *
 * Format: `{nonce}.{base64url(payload)}.{base64url(HMAC-SHA256)}`
 *
 * Why signed instead of cookie-only:
 * The callback is pinned to https://www.messaivo.com (via APP_URL).
 * When the OAuth flow is initiated from a different host (e.g. messaivo.vercel.app),
 * the state cookie is set on that host but never sent to www.messaivo.com because
 * browsers don't send cookies across different domains.  An HMAC-signed state is
 * self-contained and verifiable without any cookie, fixing the cross-host mismatch.
 *
 * The cookie is still set (defense-in-depth) but is no longer the primary check.
 */
function signState(nonce: string, userId: string): string {
  const payload = Buffer.from(JSON.stringify({ u: userId, t: Date.now() })).toString("base64url");
  const unsigned = `${nonce}.${payload}`;
  const key = Buffer.from(process.env.META_TOKEN_ENCRYPTION_KEY ?? "", "hex");
  const mac = createHmac("sha256", key).update(unsigned).digest("base64url");
  return `${unsigned}.${mac}`;
}

export async function GET(req: Request) {
  console.log("[meta/oauth] ENTRY", { url: req.url, referer: (req as Request & { headers: Headers }).headers?.get?.("referer") ?? "none" });
  const authResult = await auth();
  const { userId } = authResult;
  console.log("[meta/oauth] auth()", { hasUserId: !!userId });
  if (!userId) {
    console.warn("[meta/oauth] no userId — redirecting to /login");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const appId    = process.env.META_APP_ID;
  const configId = process.env.META_CONFIG_ID;
  if (!appId || !process.env.META_APP_SECRET) {
    console.warn("[meta/oauth] META_APP_ID or META_APP_SECRET not configured");
    return NextResponse.redirect(
      new URL("/app/pages?error=not_configured", req.url),
    );
  }

  const cbUrl = metaCallbackUrl(req);
  const stateNonce = randomBytes(16).toString("hex");
  // HMAC-signed state: nonce + userId + timestamp embedded in the state param itself.
  // This means the callback can verify identity without a cookie, which fixes the
  // cross-host failure where the cookie was set on messaivo.vercel.app but the
  // callback always goes to www.messaivo.com.
  const signedState = signState(stateNonce, userId);

  const useConfigId = !!(configId && process.env.NODE_ENV === "production");
  const reqHost = new URL(req.url).host;
  console.log("[meta/oauth] initiating OAuth", {
    env: process.env.NODE_ENV,
    reqHost,
    callbackHost: new URL(cbUrl).host,
    hasConfigId: !!configId,
    usingConfigId: useConfigId,
    redirectUri: cbUrl,
    stateFormat: "hmac-signed",
  });

  const oauthUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  oauthUrl.searchParams.set("client_id", appId);
  oauthUrl.searchParams.set("redirect_uri", cbUrl);
  oauthUrl.searchParams.set("response_type", "code");
  oauthUrl.searchParams.set("state", signedState);
  if (configId && process.env.NODE_ENV === "production") {
    // Facebook Login for Business: only used in production.
    // config_id has its own redirect URI whitelist (separate from standard Facebook Login).
    // In dev, localhost is not in that whitelist, so we fall through to the scope-based flow.
    oauthUrl.searchParams.set("config_id", configId);
  } else {
    // Standard Facebook Login: used in development and as fallback when config_id is absent.
    // The redirect URI is validated against the standard "Valid OAuth Redirect URIs" list,
    // where localhost:3000 is whitelisted.
    oauthUrl.searchParams.set("scope", "pages_show_list,pages_messaging,pages_manage_metadata");
  }

  const res = NextResponse.redirect(oauthUrl.toString());
  // Cookie kept as defense-in-depth only — not required for state verification.
  // The HMAC-signed state is the primary CSRF check.
  res.cookies.set("meta_oauth_state", stateNonce, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
