import { NextResponse } from "next/server";
import {
  parseSignedRequest,
  deleteContactData,
  createDeletionRecord,
} from "@/lib/data-deletion";

/**
 * Meta User Data Deletion callback.
 * Called by Meta when a user revokes app permissions from Facebook settings.
 * Spec: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 *
 * Request: POST application/x-www-form-urlencoded, body: signed_request=...
 * Response: { "url": "...", "confirmation_code": "..." }
 */
export async function POST(req: Request) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    console.error("[data-deletion] META_APP_SECRET is not configured");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let bodyText: string;
  try {
    bodyText = await req.text();
  } catch {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

  const params = new URLSearchParams(bodyText);
  const signedRequest = params.get("signed_request");

  if (!signedRequest) {
    return NextResponse.json({ error: "Missing signed_request" }, { status: 400 });
  }

  let userId: string;
  try {
    const payload = parseSignedRequest(signedRequest, appSecret);
    userId = payload.user_id;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Verification failed";
    console.warn("[data-deletion] Signature verification failed:", msg);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let deletedCount: number;
  try {
    deletedCount = await deleteContactData(userId);
  } catch (err) {
    console.error("[data-deletion] Deletion failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
  }

  let confirmationCode: string;
  try {
    confirmationCode = await createDeletionRecord(userId, deletedCount);
  } catch (err) {
    console.error(
      "[data-deletion] Failed to create deletion record:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://messaivo.com";
  return NextResponse.json({
    url: `${baseUrl}/deletion-status?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
}
