import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getWorkspace } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { encryptToken } from "@/lib/token-crypto";
import { metaCallbackUrl } from "@/lib/meta-oauth";

const GRAPH = "https://graph.facebook.com/v19.0";

type TokenResp = { access_token?: string; error?: { message: string } };
type FBPage   = { id: string; name: string; category?: string; access_token: string; picture?: { data?: { url?: string } } };
type AccountsResp = { data?: FBPage[]; error?: { message: string } };

export async function GET(req: Request) {
  const url  = new URL(req.url);
  const code  = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const fbErr = url.searchParams.get("error");

  if (fbErr) {
    console.warn("[meta/callback] Facebook returned error", { fbErr });
    return NextResponse.redirect(new URL("/app/pages?error=denied", req.url));
  }
  if (!code || !state) {
    console.warn("[meta/callback] Missing code or state params");
    return NextResponse.redirect(new URL("/app/pages?error=invalid_callback", req.url));
  }

  // CSRF check
  const jar = await cookies();
  const savedState = jar.get("meta_oauth_state")?.value;
  if (!savedState || savedState !== state) {
    console.warn("[meta/callback] CSRF state mismatch — possible replay or expired session");
    return NextResponse.redirect(new URL("/app/pages?error=invalid_state", req.url));
  }

  const ws = await getWorkspace();
  if (!ws) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const appId     = process.env.META_APP_ID!;
  const appSecret = process.env.META_APP_SECRET!;
  const cbUrl     = metaCallbackUrl(req);

  console.log("[meta/callback] starting token exchange", {
    env: process.env.NODE_ENV,
    callbackHost: new URL(cbUrl).host,
    workspaceId: ws.id,
  });

  try {
    // 1 — Short-lived user token
    const t1url = new URL(`${GRAPH}/oauth/access_token`);
    t1url.searchParams.set("client_id", appId);
    t1url.searchParams.set("client_secret", appSecret);
    t1url.searchParams.set("redirect_uri", cbUrl);
    t1url.searchParams.set("code", code);

    const t1 = await (await fetch(t1url.toString())).json() as TokenResp;
    if (!t1.access_token) {
      console.error("[meta/callback] short-lived token exchange failed:", t1.error?.message ?? "unknown error");
      return redirect(req, "token_error");
    }
    console.log("[meta/callback] short-lived token obtained");

    // 2 — Long-lived user token (best-effort; fall back to short-lived)
    const t2url = new URL(`${GRAPH}/oauth/access_token`);
    t2url.searchParams.set("grant_type", "fb_exchange_token");
    t2url.searchParams.set("client_id", appId);
    t2url.searchParams.set("client_secret", appSecret);
    t2url.searchParams.set("fb_exchange_token", t1.access_token);

    const t2 = await (await fetch(t2url.toString())).json() as TokenResp;
    const userToken = t2.access_token ?? t1.access_token;
    console.log("[meta/callback] user token ready", { longLived: !!t2.access_token });

    // 3 — Fetch pages the user manages
    const pUrl = new URL(`${GRAPH}/me/accounts`);
    pUrl.searchParams.set("access_token", userToken);
    pUrl.searchParams.set("fields", "id,name,category,access_token,picture{url}");
    pUrl.searchParams.set("limit", "25");

    const pData = await (await fetch(pUrl.toString())).json() as AccountsResp;

    if (pData.error) {
      console.error("[meta/callback] me/accounts failed:", pData.error.message);
      return redirect(req, "token_error");
    }
    if (!pData.data?.length) {
      console.warn("[meta/callback] no pages returned for this user");
      return redirect(req, "no_pages");
    }

    console.log("[meta/callback] upserting pages", { count: pData.data.length });

    // 4 — Upsert each page as isActive: false (pending user selection)
    //     Token is encrypted at rest before being written to DB.
    for (const p of pData.data) {
      if (!p.access_token) continue;
      const encryptedToken = encryptToken(p.access_token);
      await prisma.facebookPage.upsert({
        where: { workspaceId_pageId: { workspaceId: ws.id, pageId: p.id } },
        update: {
          pageName:          p.name,
          accessToken:       encryptedToken,
          pageCategory:      p.category ?? null,
          pageAvatar:        p.picture?.data?.url ?? null,
          isActive:          false,
          webhookSubscribed: false, // reset on re-auth so re-activation re-subscribes
          lastSyncedAt:      new Date(),
        },
        create: {
          workspaceId:  ws.id,
          pageId:       p.id,
          pageName:     p.name,
          accessToken:  encryptedToken,
          pageCategory: p.category ?? null,
          pageAvatar:   p.picture?.data?.url ?? null,
          isActive:     false,
        },
        select: { id: true },
      });
    }

    console.log("[meta/callback] OAuth complete — redirecting to page selection");
    const dest = new URL("/app/pages", req.url);
    dest.searchParams.set("flow", "select");
    const res = NextResponse.redirect(dest.toString());
    res.cookies.delete("meta_oauth_state");
    return res;

  } catch (e) {
    console.error("[meta/callback] unexpected error:", e instanceof Error ? e.message : String(e));
    return redirect(req, "server_error");
  }
}

function redirect(req: Request, error: string) {
  const res = NextResponse.redirect(new URL(`/app/pages?error=${error}`, req.url));
  res.cookies.delete("meta_oauth_state");
  return res;
}
