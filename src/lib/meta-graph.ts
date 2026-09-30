import { utilityPayload, templateKeys } from "@/lib/messaging-policy";
export const GRAPH = "https://graph.facebook.com/v26.0";
export const META_ERR_TOKEN_EXPIRED = 190;
export const META_ERR_WINDOW_EXPIRED = 1545041;
export const META_ERR_RATE_LIMIT = 613;
export interface SendResult {
  messageId: string | null; error: string | null; errorCode: number | null;
  errorSubcode?: number; httpStatus?: number; retryable?: boolean; uncertain?: boolean;
}
export async function graphRequest(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(GRAPH + path, { ...init, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", ...init.headers }, signal: AbortSignal.timeout(15000), cache: "no-store" });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || "Meta HTTP " + res.status);
  return data;
}
export async function sendPayload(token: string, pageId: string, payload: unknown): Promise<SendResult> {
  try {
    const res = await fetch(GRAPH + "/" + pageId + "/messages", { method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
    let data;
    try { data = await res.json(); } catch { return { messageId: null, error: "Unparseable Meta response; outcome unknown", errorCode: null, uncertain: true, httpStatus: res.status }; }
    if (data.error || !res.ok) return { messageId: null, error: data.error?.message || "Meta HTTP " + res.status, errorCode: data.error?.code ?? null, errorSubcode: data.error?.error_subcode, httpStatus: res.status,
      retryable: !!data.error && (data.error.is_transient === true || [4, 17, 32, 613].includes(data.error.code) || res.status === 429), uncertain: !data.error };
    if (!data.message_id) return { messageId: null, error: "Meta omitted message_id; outcome unknown", errorCode: null, uncertain: true };
    return { messageId: data.message_id, error: null, errorCode: null };
  } catch { return { messageId: null, error: "Transport failed; outcome unknown (do not automatically resend)", errorCode: null, uncertain: true }; }
}
export async function sendMessengerMessage(token: string, pageId: string, psid: string, text: string) {
  return sendPayload(token, pageId, { recipient: { id: psid }, messaging_type: "RESPONSE", message: { text } });
}
export async function sendUtilityMessage(token: string, pageId: string, psid: string, name: string, values: Record<string, string>, language = "en") {
  return sendPayload(token, pageId, utilityPayload(psid, name, values, language));
}
export interface UtilityTemplateField { key: string; example: string }
export interface CreateUtilityTemplateResult { metaTemplateId?: string; metaTemplateName: string; status: string; error?: string }
export async function createMetaUtilityTemplate(token: string, pageId: string, name: string, content: string, fields: UtilityTemplateField[], language = "en"): Promise<CreateUtilityTemplateResult> {
  try {
    const keys = templateKeys(content);
    const examples = keys.map(key => { const example = fields.find(f => f.key === key)?.example; if (!example?.trim()) throw new Error("Missing review example: " + key); return { param_name: key, example }; });
    const data = await graphRequest(token, "/" + pageId + "/message_templates", { method: "POST", body: JSON.stringify({ name, language, category: "UTILITY", parameter_format: "NAMED", components: [{ type: "BODY", text: content, ...(examples.length ? { example: { body_text_named_params: examples } } : {}) }] }) });
    if (!data.id) throw new Error("Meta did not return a template ID; refresh before retrying registration");
    return { metaTemplateId: String(data.id), metaTemplateName: name, status: data.status || "PENDING" };
  } catch (error) { return { metaTemplateName: name, status: "ERROR", error: error instanceof Error ? error.message : "Registration failed" }; }
}

// ── Conversation scan ─────────────────────────────────────────────────────────

export interface MetaConversationParticipant {
  id: string;
  name?: string;
}

export interface MetaConversationMessage {
  id: string;
  message?: string;
  from?: { id: string; name?: string };
  created_time: string;
}

export interface MetaConversation {
  id: string;
  participants: { data: MetaConversationParticipant[] };
  messages?: {
    data: MetaConversationMessage[];
    paging?: { cursors?: { after?: string }; next?: string };
  };
}

export interface ConversationPageResult {
  conversations: MetaConversation[];
  nextCursor: string | null;
  error: string | null;
}

/**
 * Fetch one page of Messenger conversations for a Facebook Page.
 * Returns up to 100 threads with their most recent 25 messages each.
 * Token must already be decrypted before passing here.
 *
 * Pagination notes:
 * - `limit=100` keeps the number of round-trips low while staying within
 *   Meta's documented maximum for cursor-paginated endpoints.
 * - `messages.limit(25)` is explicit so Meta returns a predictable sub-set
 *   per conversation rather than the default (which can vary).
 * - The cursor is extracted from `paging.cursors.after` first, then falls
 *   back to parsing the `after` param from the `paging.next` URL — this
 *   handles API responses that omit the `cursors` object.
 */
export async function fetchConversationPage(
  pageAccessToken: string,
  metaPageId: string,
  afterCursor?: string | null,
): Promise<ConversationPageResult> {
  const url = new URL(`${GRAPH}/${metaPageId}/conversations`);
  url.searchParams.set("platform", "messenger");
  // Explicit message sub-limit avoids Meta silently capping conversation results
  url.searchParams.set("fields", "id,participants,messages.limit(25){id,message,from,created_time}");
  url.searchParams.set("limit", "100");
  url.searchParams.set("access_token", pageAccessToken);
  if (afterCursor) url.searchParams.set("after", afterCursor);

  type ApiResp = {
    data?: MetaConversation[];
    paging?: { cursors?: { after?: string }; next?: string };
    error?: { message: string; code?: number };
  };

  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch (err) {
    return { conversations: [], nextCursor: null, error: `Network error: ${String(err)}` };
  }

  let body: ApiResp;
  try {
    body = await res.json() as ApiResp;
  } catch {
    return { conversations: [], nextCursor: null, error: `Non-JSON response (HTTP ${res.status})` };
  }

  if (!res.ok || body.error) {
    return {
      conversations: [],
      nextCursor: null,
      error: body.error?.message ?? `HTTP ${res.status}`,
    };
  }

  // Extract the after-cursor that drives the next page.
  // Primary:  paging.cursors.after  (standard cursor-paging shape)
  // Fallback: parse ?after= from paging.next (some Meta endpoints omit cursors object)
  let nextCursor: string | null = null;
  if (body.paging?.next) {
    nextCursor = body.paging.cursors?.after ?? null;
    if (!nextCursor) {
      try {
        nextCursor = new URL(body.paging.next).searchParams.get("after");
      } catch {
        // malformed next URL — treat as no more pages
      }
    }
  }

  return { conversations: body.data ?? [], nextCursor, error: null };
}

export interface SubscribeResult {
  success: boolean;
  error: string | null;
}

/**
 * Subscribe a Facebook Page to the required Messenger webhook fields.
 * Must be called with the page's own access token (not a user token).
 */
export async function subscribePageToWebhook(
  pageAccessToken: string,
  metaPageId: string,
): Promise<SubscribeResult> {
  const fields = [
    "messages",
    "messaging_postbacks",
    "messaging_optins",
    "messaging_optouts",
    "message_deliveries",
    "message_reads",
    "message_template_status_update",
  ].join(",");

  let res: Response;
  try {
    res = await fetch(
      `${GRAPH}/${metaPageId}/subscribed_apps` +
      `?access_token=${pageAccessToken}&subscribed_fields=${fields}`,
      { method: "POST" },
    );
  } catch (err) {
    return { success: false, error: String(err) };
  }

  const data = await res.json() as { success?: boolean; error?: { message: string } };

  if (!res.ok || !data.success) {
    return { success: false, error: data.error?.message ?? `HTTP ${res.status}` };
  }

  return { success: true, error: null };
}
