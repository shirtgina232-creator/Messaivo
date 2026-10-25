import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { encryptToken } from "@/lib/token-crypto";
import { metaCallbackUrl } from "@/lib/meta-oauth";
import { subscribePageToWebhook } from "@/lib/meta-graph";

/**
 * Trusted Messaivo hosts that may appear as the OAuth origin.
 *
 * Static allowlist covers production and the root Vercel alias.
 * The pattern check covers branch/deployment previews issued by Vercel
 * for this project (e.g. messaivo-git-feat-foo-messaivo.vercel.app).
 * ALLOWED_EXTRA_HOSTS (comma-separated, Preview env var) is an escape hatch
 * for any host that doesn't match the pattern.
 *
 * Any host that fails all checks falls back to www.messaivo.com so we can
 * never be used as an open redirector.
 */
const ALLOWED_ORIGIN_HOSTS = new Set([
  "www.messaivo.com",
  "messaivo.vercel.app",
  // Parse the escape-hatch env var once at module load time.
  ...(process.env.ALLOWED_EXTRA_HOSTS ?? "").split(",").map(h => h.trim()).filter(Boolean),
]);

// Vercel preview pattern for this project: <anything>-messaivo.vercel.app
const VERCEL_PREVIEW_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?-messaivo\.vercel\.app$/;

function isAllowedHost(host: string): boolean {
  return ALLOWED_ORIGIN_HOSTS.has(host) || VERCEL_PREVIEW_RE.test(host);
}

/**
 * Verify an HMAC-signed state token produced by signState() in /api/auth/meta.
 *
 * Format: `{nonce}.{base64url(payload)}.{base64url(HMAC-SHA256)}`
 *
 * Primary CSRF check.  The cookie is no longer the primary check because the
 * callback is pinned to www.messaivo.com via APP_URL while OAuth can be
 * initiated from any host (e.g. messaivo.vercel.app).  Cookies scoped to the
 * initiating host are never sent to a different domain in the callback.
 *
 * The payload now carries `h` (origin host) so the callback can redirect back
 * to the initiating host's /auth/relay, where the Clerk session lives.
 */
function verifyState(state: string): { ok: true; userId: string; nonce: string; originHost: string } | { ok: false; reason: string } {
  const parts = state.split(".");
  if (parts.length !== 3) return { ok: false, reason: "bad_format" };
  const [nonce, payloadB64, mac] = parts;
  const unsigned = `${nonce}.${payloadB64}`;
  const key = Buffer.from(process.env.META_TOKEN_ENCRYPTION_KEY ?? "", "hex");
  if (key.length < 32) return { ok: false, reason: "encryption_key_too_short" };
  const expectedMac = createHmac("sha256", key).update(unsigned).digest("base64url");
  try {
    const macBuf      = Buffer.from(mac, "base64url");
    const expectedBuf = Buffer.from(expectedMac, "base64url");
    if (macBuf.length !== expectedBuf.length || !timingSafeEqual(macBuf, expectedBuf)) {
      return { ok: false, reason: "bad_mac" };
    }
  } catch {
    return { ok: false, reason: "mac_parse_error" };
  }
  let payload: { u: string; t: number; h?: string };
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "bad_payload" };
  }
  if (!payload.u || typeof payload.t !== "number") return { ok: false, reason: "bad_payload_fields" };
  if (Date.now() - payload.t > 600_000) return { ok: false, reason: "state_expired" };
  // `h` is required from this deploy onward.  Old tokens (< 10 min old) that
  // lack it fall back to www.messaivo.com — safe because they will be gone
  // within one token TTL of the deploy.
  const originHost = typeof payload.h === "string" && payload.h.length > 0
    ? payload.h
    : "www.messaivo.com";
  return { ok: true, userId: payload.u, nonce, originHost };
}

const GRAPH = "https://graph.facebook.com/v26.0";

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

  console.log("[meta/callback] received", {
    hasCode: !!code,
    hasState: !!state,
    hasFbErr: !!fbErr,
    callbackUrl: url.origin + url.pathname,
  });

  // ── Facebook-side errors (user declined, app not configured, etc.) ───────────
  if (fbErr) {
    console.warn("[meta/callback] Facebook returned error param", { fbErr, fbDesc });
    return redirect(req, "denied");
  }
  if (!code || !state) {
    console.warn("[meta/callback] Missing code or state", { hasCode: !!code, hasState: !!state });
    return redirect(req, "invalid_callback");
  }

  // ── CSRF + userId extraction (HMAC-signed state — no cookie dependency) ────────
  // The HMAC-signed state is the primary check.  The cookie is no longer required
  // because the callback is pinned to www.messaivo.com while initiation can come
  // from any host; cookies set on the initiating host are not sent to the callback.
  const stateVerification = verifyState(state);
  if (!stateVerification.ok) {
    console.warn("[meta/callback] state validation failed", { reason: stateVerification.reason });
    return redirect(req, `invalid_state_${stateVerification.reason}`);
  }
  const savedClerkId = stateVerification.userId;
  console.log("[meta/callback] state valid", { originHost: stateVerification.originHost });

  // ── Env-var pre-flight (cheap checks before spending the OAuth code) ─────────
  const appId     = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    console.error("[meta/callback] META_APP_ID or META_APP_SECRET not configured in Vercel");
    return redirect(req, "not_configured");
  }

  const encKeyLen = (process.env.META_TOKEN_ENCRYPTION_KEY ?? "").length;
  if (process.env.NODE_ENV === "production" && encKeyLen < 64) {
    console.error(
      "[meta/callback] META_TOKEN_ENCRYPTION_KEY is missing or too short in Vercel " +
      `(length=${encKeyLen}). Set it to a 64-hex-char string.`
    );
    return redirect(req, "encryption_error");
  }

  const cbUrl = metaCallbackUrl(req);
  console.log("[meta/callback] using redirect_uri", cbUrl);

  try {
    // ── Workspace — resolved via userId from HMAC-signed state ──────────────────
    // savedClerkId now holds the internal User.id (not a Clerk id) after the
    // Clerk removal. Variable name kept for minimal diff.
    const dbUser = await prisma.user.findUnique({
      where: { id: savedClerkId },
      include: { workspace: true },
    });
    const ws = dbUser?.workspace ?? null;
    if (!ws || dbUser?.status !== "ACTIVE") {
      console.warn("[meta/callback] workspace lookup failed", {
        userId: savedClerkId,
        found: !!dbUser,
        status: dbUser?.status ?? "none",
      });
      const res = NextResponse.redirect(new URL("/app/pages?error=session_expired", req.url));
      res.cookies.delete("meta_oauth_state");
      return res;
    }
    console.log("[meta/callback] workspace found", { workspaceId: ws.id });

    // ── 1. Short-lived user token ──────────────────────────────────────────────
    console.log("[meta/callback] exchanging code for short-lived token");
    const t1url = new URL(`${GRAPH}/oauth/access_token`);
    t1url.searchParams.set("client_id", appId);
    t1url.searchParams.set("client_secret", appSecret);
    t1url.searchParams.set("redirect_uri", cbUrl);
    t1url.searchParams.set("code", code);

    const t1Result = await fetchJson<TokenResp>(t1url.toString());
    if (!t1Result.ok) {
      console.error("[meta/callback] short-lived token exchange failed (HTTP/network):", t1Result.error, { status: t1Result.status });
      return redirect(req, "token_error");
    }
    if (!t1Result.data.access_token) {
      console.error("[meta/callback] short-lived token exchange failed (Graph error):",
        t1Result.data.error?.message ?? "no access_token in response",
        { errorCode: t1Result.data.error?.code }
      );
      return redirect(req, "token_error");
    }
    const shortLivedToken = t1Result.data.access_token;
    console.log("[meta/callback] short-lived user token obtained");

    // ── 2. Long-lived user token (best-effort; fall back to short-lived) ────────
    console.log("[meta/callback] exchanging for long-lived user token");
    const t2url = new URL(`${GRAPH}/oauth/access_token`);
    t2url.searchParams.set("grant_type", "fb_exchange_token");
    t2url.searchParams.set("client_id", appId);
    t2url.searchParams.set("client_secret", appSecret);
    t2url.searchParams.set("fb_exchange_token", shortLivedToken);

    const t2Result = await fetchJson<TokenResp>(t2url.toString());
    const userToken = (t2Result.ok && t2Result.data.access_token)
      ? t2Result.data.access_token
      : shortLivedToken;  // fall back gracefully
    console.log("[meta/callback] user token ready", {
      longLived: userToken !== shortLivedToken,
      exchangeError: !t2Result.ok ? t2Result.error : null,
    });

    // ── 3. Pages the user manages ──────────────────────────────────────────────
    console.log("[meta/callback] fetching managed pages from /me/accounts");
    const pUrl = new URL(`${GRAPH}/me/accounts`);
    pUrl.searchParams.set("access_token", userToken);
    pUrl.searchParams.set("fields", "id,name,category,access_token,picture{url}");
    pUrl.searchParams.set("limit", "25");

    const pResult = await fetchJson<AccountsResp>(pUrl.toString());
    if (!pResult.ok) {
      console.error("[meta/callback] /me/accounts failed (HTTP/network):", pResult.error, { status: pResult.status });
      return redirect(req, "token_error");
    }
    if (pResult.data.error) {
      console.error("[meta/callback] /me/accounts Graph error:",
        pResult.data.error.message, { code: pResult.data.error.code }
      );
      return redirect(req, "token_error");
    }
    const pages = pResult.data.data ?? [];
    console.log("[meta/callback] /me/accounts result", {
      totalPages: pages.length,
      pagesWithToken: pages.filter(p => !!p.access_token).length,
    });
    // Log per-page token presence — never logs the token value itself
    for (const p of pages) {
      console.log("[meta/callback] page in /me/accounts", {
        pageId: p.id,
        pageName: p.name,
        hasToken: !!p.access_token,
      });
    }
    if (!pages.length) {
      console.warn("[meta/callback] /me/accounts returned 0 pages — user may not manage any pages");
      return redirect(req, "no_pages");
    }

    // ── 4. Encrypt & upsert each page ─────────────────────────────────────────
    // Pages without an access_token are skipped (unlikely but defensive).
    // New pages are created inactive; existing records get their token refreshed.
    const upsertedPageIds: string[] = [];
    for (const p of pages) {
      if (!p.access_token) {
        console.warn("[meta/callback] page missing access_token, skipping", { pageId: p.id, pageName: p.name });
        continue;
      }

      let encryptedToken: string;
      try {
        encryptedToken = encryptToken(p.access_token);
      } catch (err) {
        console.error(
          "[meta/callback] encryptToken failed for page — check META_TOKEN_ENCRYPTION_KEY in Vercel:",
          err instanceof Error ? err.message : String(err),
          { pageId: p.id }
        );
        return redirect(req, "encryption_error");
      }

      await prisma.facebookPage.upsert({
        where: { workspaceId_pageId: { workspaceId: ws.id, pageId: p.id } },
        update: {
          pageName:                 p.name,
          accessToken:              encryptedToken,
          pageCategory:             p.category ?? null,
          pageAvatar:               p.picture?.data?.url ?? null,
          utilityPermissionGranted: false,
          permissionsCheckedAt:     null,
          lastSyncedAt:             new Date(),
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
      upsertedPageIds.push(p.id);
      console.log("[meta/callback] page token saved", { pageId: p.id, pageName: p.name });
    }
    console.log("[meta/callback] DB upsert complete", { upsertedCount: upsertedPageIds.length });

    // If pages were returned but none had an access_token, the Business Login
    // configuration is not granting page-management permissions.  Treat this as
    // an error rather than silently succeeding with no DB writes.
    if (upsertedPageIds.length === 0 && pages.length > 0) {
      console.error("[meta/callback] /me/accounts returned pages but none had access_token", {
        pageCount: pages.length,
        pageIds: pages.map(p => p.id),
        hint: "Check Business Login config in Meta app dashboard — pages_manage_metadata or pages_messaging may be missing",
      });
      return redirect(req, "no_page_tokens");
    }

    // ── 5. Re-subscribe webhook for active pages using the fresh token ─────────
    // This runs unconditionally on every OAuth flow — first connect and reconnect
    // alike — so a stale or expired Meta subscription is always refreshed when the
    // user completes the OAuth dialog.  webhookSubscribed:true in the DB merely
    // records that we attempted it once; it cannot guarantee Meta's subscription
    // is still active after a token expiry, so we never skip this step.
    for (const p of pages) {
      if (!p.access_token) continue;
      const activePage = await prisma.facebookPage.findFirst({
        where: { workspaceId: ws.id, pageId: p.id, isActive: true },
        select: { id: true },
      });
      if (!activePage) continue; // new/inactive pages are subscribed when first activated via PATCH
      console.log("[meta/callback] re-subscribing webhook for active page", { pageId: p.id });
      const subResult = await subscribePageToWebhook(p.access_token, p.id);
      if (subResult.success) {
        await prisma.facebookPage.update({
          where: { id: activePage.id },
          data: { webhookSubscribed: true },
        });
        console.log("[meta/callback] webhook subscription confirmed", { pageId: p.id });
      } else {
        console.warn("[meta/callback] webhook subscription failed", { pageId: p.id, error: subResult.error });
      }
    }

    // ── Relay redirect ─────────────────────────────────────────────────────────
    // Send the browser back to the HOST that initiated the OAuth flow (stored in
    // the signed state as `h`). That host is where the Clerk session lives.
    // Validate against the allowlist so we can never be used as an open redirector.
    const relayHost = isAllowedHost(stateVerification.originHost)
      ? stateVerification.originHost
      : "www.messaivo.com";
    console.log("[meta/callback] OAuth complete — redirecting via relay", {
      relayHost,
      originHost: stateVerification.originHost,
    });
    const dest = new URL(`https://${relayHost}/auth/relay`);
    dest.searchParams.set("to", "/app/pages?flow=select");
    const res = NextResponse.redirect(dest.toString());
    res.cookies.delete("meta_oauth_state");
    return res;

  } catch (e) {
    console.error(
      "[meta/callback] unhandled exception:",
      e instanceof Error ? e.message : String(e),
      "\nstack:", e instanceof Error ? (e.stack ?? "(no stack)") : "",
    );
    return redirect(req, "server_error");
  }
}
