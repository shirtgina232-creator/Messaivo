const GRAPH = "https://graph.facebook.com/v19.0";

// Meta error code constants
export const META_ERR_TOKEN_EXPIRED = 190;
export const META_ERR_WINDOW_EXPIRED = 1545041;
export const META_ERR_RATE_LIMIT = 613;

export interface SendResult {
  messageId: string | null;
  error: string | null;
  errorCode: number | null;
}

/**
 * Send a text message from a Facebook Page to a user via Messenger.
 * Uses messaging_type RESPONSE (within 24-hour window).
 * Token must already be decrypted before passing here.
 */
export async function sendMessengerMessage(
  pageAccessToken: string,
  metaPageId: string,
  recipientPsid: string,
  text: string,
): Promise<SendResult> {
  let res: Response;
  try {
    res = await fetch(
      `${GRAPH}/${metaPageId}/messages?access_token=${pageAccessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: recipientPsid },
          messaging_type: "RESPONSE",
          message: { text },
        }),
      },
    );
  } catch (err) {
    return { messageId: null, error: String(err), errorCode: null };
  }

  const data = await res.json() as {
    message_id?: string;
    error?: { message: string; code: number };
  };

  if (!res.ok || data.error) {
    return {
      messageId: null,
      error: data.error?.message ?? `HTTP ${res.status}`,
      errorCode: data.error?.code ?? null,
    };
  }

  return { messageId: data.message_id ?? null, error: null, errorCode: null };
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
 * Returns up to 20 threads with their most recent messages.
 * Token must already be decrypted before passing here.
 */
export async function fetchConversationPage(
  pageAccessToken: string,
  metaPageId: string,
  afterCursor?: string | null,
): Promise<ConversationPageResult> {
  const url = new URL(`${GRAPH}/${metaPageId}/conversations`);
  url.searchParams.set("platform", "messenger");
  url.searchParams.set("fields", "id,participants,messages{id,message,from,created_time}");
  url.searchParams.set("limit", "20");
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

  const nextCursor = body.paging?.next ? (body.paging.cursors?.after ?? null) : null;
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
