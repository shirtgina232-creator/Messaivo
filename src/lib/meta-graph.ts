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
