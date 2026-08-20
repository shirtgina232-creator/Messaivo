import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { randomBytes } from "crypto";
import { metaCallbackUrl } from "@/lib/meta-oauth";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
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
  const state = randomBytes(16).toString("hex");

  console.log("[meta/oauth] initiating OAuth", {
    env: process.env.NODE_ENV,
    callbackHost: new URL(cbUrl).host,
    hasConfigId: !!configId,
  });

  const oauthUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  oauthUrl.searchParams.set("client_id", appId);
  oauthUrl.searchParams.set("redirect_uri", cbUrl);
  if (configId) oauthUrl.searchParams.set("config_id", configId);
  oauthUrl.searchParams.set("scope", "pages_show_list,pages_messaging,pages_manage_metadata");
  oauthUrl.searchParams.set("response_type", "code");
  oauthUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(oauthUrl.toString());
  res.cookies.set("meta_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
