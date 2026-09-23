import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { randomBytes } from "crypto";
import { metaCallbackUrl } from "@/lib/meta-oauth";

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
  // stateNonce is echoed by Facebook for CSRF verification.
  // We embed userId in the cookie (httpOnly, not sent to Facebook) so the callback
  // can resolve the workspace without needing the Clerk session — Clerk's
  // cross-origin handshake makes auth() unavailable during the Facebook redirect-back.
  const state = stateNonce;

  const useConfigId = !!(configId && process.env.NODE_ENV === "production");
  console.log("[meta/oauth] initiating OAuth", {
    env: process.env.NODE_ENV,
    callbackHost: new URL(cbUrl).host,
    hasConfigId: !!configId,
    usingConfigId: useConfigId,
    redirectUri: cbUrl,
  });

  const oauthUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  oauthUrl.searchParams.set("client_id", appId);
  oauthUrl.searchParams.set("redirect_uri", cbUrl);
  oauthUrl.searchParams.set("response_type", "code");
  oauthUrl.searchParams.set("state", state);
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
  res.cookies.set("meta_oauth_state", `${stateNonce}:${userId}`, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
