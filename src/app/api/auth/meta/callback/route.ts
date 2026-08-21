import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getWorkspace } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { encryptToken } from "@/lib/token-crypto";
import { metaCallbackUrl } from "@/lib/meta-oauth";

const GRAPH = "https://graph.facebook.com/v19.0";

type TokenResp    = { access_token?: string; error?: { message: string; code?: number } };
type FBPage       = { id: string; name: string; category?: string; access_token: string; picture?: { data?: { url?: string } } };
type AccountsResp = { data?: FBPage[]; error?: { message: string; code?: number } };

// ── Helpers ───────────────────────────────────────────────────────────────────

function redirect(req: Request, error: string) {
  const res = NextResponse.redirect(new URL(`/app/pages?error=${error}`, req.url));
  res.cookies.delete("meta_oauth_state");
  return res;
}

type FetchOk<T>   = { ok: true;  data: T };
type FetchFail    = { ok: false; error: string; status?: number };
type FetchResult<T> = FetchOk<T> | FetchFail;

/**
 * Fetch JSON safely. Never throws.
 * Returns { ok: true, data } on success or { ok: false, error } on any failure.
 */
async function fetchJson<T>(url: string): Promise<FetchResult<T>> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    return { ok: false, error: `fetch failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "(unreadable)");
    return { ok: false, status: res.status, error: `HTTP ${res.status}: ${body.slice(0, 300)}` };
  }

  try {
    const data = await res.json() as T;
    return { ok: true, data };
  } catch {
    return { ok: false, status: res.status, error: `response is not JSON (status ${res.status})` };
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const url    = new URL(req.url);
  const code   = url.searchParams.get("code");
  const state  = url.searchParams.get("state");
  const fbErr  = url.searchParams.get("error");
  const fbDesc = url.searchParams.get("error_description");

  // ── Facebook-side errors (user declined, app not configured, etc.) ───────────
  if (fbErr) {
    console.warn("[meta/callback] Facebook returned error param", { fbErr, fbDesc });
    return redirect(req, "denied");
  }
  if (!code || !state) {
    console.warn("[meta/callback] Missing code or state", { hasCode: !!code, hasState: !!state });
    return redirect(req, "invalid_callback");
  }

  // ── CSRF ──────────────────────────────────────────────────────────────────────
  const jar = await cookies();
  const savedState = jar.get("meta_oauth_state")?.value;
  if (!savedState || savedState !== state) {
    console.warn("[meta/callback] CSRF state mismatch — expired or replayed session", { hasSavedState: !!savedState });
    return redirect(req, "invalid_state");
  }

  // ── Env-var pre-flight (cheap checks before spending the OAuth code) ─────────
  const appId     = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    console.error("[meta/callback] META_APP_ID or META_APP_SECRET not configured in Vercel");
    return redirect(req, "not_configured");
  }

  const encKeyLen = (process.env.META_TOKEN_ENCRYPTION_KEY ?? "").length;
  const envLabel  = process.env.NODE_ENV;
  console.log("[meta/callback] pre-flight OK", {
    env: envLabel,
    callbackHost: new URL(metaCallbackUrl(req)).host,
    encryptionKeyLen: encKeyLen,
    encryptionKeyValid: encKeyLen >= 64,
  });

  if (process.env.NODE_ENV === "production" && encKeyLen < 64) {
    console.error(
      "[meta/callback] META_TOKEN_ENCRYPTION_KEY is missing or too short in Vercel " +
      `(length=${encKeyLen}). Set it to a 64-hex-char string.`
    );
    return redirect(req, "encryption_error");
  }

  const cbUrl = metaCallbackUrl(req);

  try {
    // ── Workspace ──────────────────────────────────────────────────────────────
    const ws = await getWorkspace();
    if (!ws) {
      console.warn("[meta/callback] No workspace — user not authenticated (Clerk session missing)");
      const res = NextResponse.redirect(new URL("/login", req.url));
      res.cookies.delete("meta_oauth_state");
      return res;
    }
    console.log("[meta/callback] workspace found", { workspaceId: ws.id });

    // ── 1. Short-lived user token ──────────────────────────────────────────────
    const t1url = new URL(`${GRAPH}/oauth/access_token`);
    t1url.searchParams.set("client_id", appId);
    t1url.searchParams.set("client_secret", appSecret);
    t1url.searchParams.set("redirect_uri", cbUrl);
    t1url.searchParams.set("code", code);

    const t1Result = await fetchJson<TokenResp>(t1url.toString());
    if (!t1Result.ok) {
      console.error("[meta/callback] short-lived token failed:", t1Result.error);
      return redirect(req, "token_error");
    }
    if (!t1Result.data.access_token) {
      console.error("[meta/callback] short-lived token exchange failed:", t1Result.data.error?.message ?? "no access_token");
      return redirect(req, "token_error");
    }
    const shortLivedToken = t1Result.data.access_token;
    console.log("[meta/callback] short-lived token obtained");

    // ── 2. Long-lived user token (best-effort; fall back to short-lived) ────────
    const t2url = new URL(`${GRAPH}/oauth/access_token`);
    t2url.searchParams.set("grant_type", "fb_exchange_token");
    t2url.searchParams.set("client_id", appId);
    t2url.searchParams.set("client_secret", appSecret);
    t2url.searchParams.set("fb_exchange_token", shortLivedToken);

    const t2Result = await fetchJson<TokenResp>(t2url.toString());
    const userToken = (t2Result.ok && t2Result.data.access_token)
      ? t2Result.data.access_token
      : shortLivedToken;  // fall back gracefully
    console.log("[meta/callback] user token ready", { longLived: userToken !== shortLivedToken });

    // ── 3. Pages the user manages ──────────────────────────────────────────────
    const pUrl = new URL(`${GRAPH}/me/accounts`);
    pUrl.searchParams.set("access_token", userToken);
    pUrl.searchParams.set("fields", "id,name,category,access_token,picture{url}");
    pUrl.searchParams.set("limit", "25");

    const pResult = await fetchJson<AccountsResp>(pUrl.toString());
    if (!pResult.ok) {
      console.error("[meta/callback] me/accounts failed:", pResult.error);
      return redirect(req, "token_error");
    }
    if (pResult.data.error) {
      console.error("[meta/callback] me/accounts Graph error:", pResult.data.error.message, "code:", pResult.data.error.code);
      return redirect(req, "token_error");
    }
    if (!pResult.data.data?.length) {
      console.warn("[meta/callback] me/accounts returned 0 pages for this token");
      return redirect(req, "no_pages");
    }
    const pages = pResult.data.data;
    console.log("[meta/callback] pages fetched", { count: pages.length });

    // ── 4. Encrypt & upsert ────────────────────────────────────────────────────
    for (const p of pages) {
      if (!p.access_token) continue;

      let encryptedToken: string;
      try {
        encryptedToken = encryptToken(p.access_token);
      } catch (err) {
        console.error(
          "[meta/callback] encryptToken failed — check META_TOKEN_ENCRYPTION_KEY in Vercel:",
          err instanceof Error ? err.message : String(err)
        );
        return redirect(req, "encryption_error");
      }

      await prisma.facebookPage.upsert({
        where: { workspaceId_pageId: { workspaceId: ws.id, pageId: p.id } },
        update: {
          pageName:          p.name,
          accessToken:       encryptedToken,
          pageCategory:      p.category ?? null,
          pageAvatar:        p.picture?.data?.url ?? null,
          isActive:          false,
          webhookSubscribed: false,
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
    console.error("[meta/callback] unhandled exception:", e instanceof Error ? e.message : String(e));
    return redirect(req, "server_error");
  }
}
