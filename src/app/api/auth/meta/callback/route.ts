import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { encryptToken } from "@/lib/token-crypto";
import { metaCallbackUrl } from "@/lib/meta-oauth";

/**
 * Trusted Messaivo hosts that may appear as the OAuth origin.
 * MUST be kept in sync with the actual production and preview hostnames.
 * Any host not in this set is rejected — the relay redirect falls back to
 * www.messaivo.com so we can never be used as an open redirector.
 */
const ALLOWED_ORIGIN_HOSTS = new Set([
  "www.messaivo.com",
  "messaivo.vercel.app",
]);

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

  // ── CSRF + userId extraction (HMAC-signed state — no cookie dependency) ────────
  // The HMAC-signed state is the primary check.  The cookie is no longer required
  // because the callback is pinned to www.messaivo.com while initiation can come
  // from any host; cookies set on the initiating host are not sent to the callback.
  const stateVerification = verifyState(state);
  if (!stateVerification.ok) {
    console.warn("[meta/callback] invalid state", { reason: stateVerification.reason });
    return redirect(req, "invalid_state");
  }
  const savedClerkId = stateVerification.userId;

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

  try {
    // ── Workspace — resolved via userId from HMAC-signed state, not from auth() ──
    // auth() is unavailable here: Clerk's cross-origin handshake intercepts the
    // Facebook redirect-back before this handler runs. savedClerkId (extracted from
    // the verified state payload) is the safe alternative.
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: savedClerkId },
      include: { workspace: true },
    });
    const ws = dbUser?.workspace ?? null;
    if (!ws) {
      console.warn("[meta/callback] No workspace found for clerkId from state cookie", { clerkId: savedClerkId });
      const res = NextResponse.redirect(new URL("/app/pages?error=session_expired", req.url));
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

    // Relay redirect: send the browser back to the HOST that initiated the
    // OAuth flow (stored in the signed state as `h`).  That host is where
    // the Clerk __session cookie lives.  Validate against the allowlist so we
    // can never be used as an open redirector.
    const relayHost = ALLOWED_ORIGIN_HOSTS.has(stateVerification.originHost)
      ? stateVerification.originHost
      : "www.messaivo.com"; // safe fallback for any unknown host
    console.log("[meta/callback] OAuth complete — redirecting via relay to page selection", {
      relayHost,
      originHost: stateVerification.originHost,
    });
    const dest = new URL(`https://${relayHost}/auth/relay`);
    dest.searchParams.set("to", "/app/pages?flow=select");
    const res = NextResponse.redirect(dest.toString());
    res.cookies.delete("meta_oauth_state");
    return res;

  } catch (e) {
    console.error("[meta/callback] unhandled exception:", e instanceof Error ? e.message : String(e));
    return redirect(req, "server_error");
  }
}
