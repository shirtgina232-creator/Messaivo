import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, notFound, badRequest, serverError, ok } from "@/lib/api-helpers";
import { decryptToken } from "@/lib/token-crypto";
import { sendMessengerMessage } from "@/lib/meta-graph";

const MAX_TEST_RECIPIENTS = 5;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const { id } = await params;

    const broadcast = await prisma.broadcast.findFirst({
      where: { id, workspaceId: ws.id },
      select: { id: true, status: true, pageId: true, message: true },
    });
    if (!broadcast) return notFound("Broadcast not found");

    if (broadcast.status !== "draft" && broadcast.status !== "scheduled") {
      return badRequest(`Cannot test-send a broadcast with status "${broadcast.status}"`);
    }
    if (!broadcast.pageId) return badRequest("Broadcast has no associated Facebook Page");

    let body: unknown;
    try { body = await req.json(); } catch { return badRequest("Invalid JSON body"); }

    const { contactIds } = body as Record<string, unknown>;
    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return badRequest("Provide contactIds array (1–5 contacts)");
    }
    if (contactIds.length > MAX_TEST_RECIPIENTS) {
      return badRequest(`Test send is limited to ${MAX_TEST_RECIPIENTS} recipients`);
    }

    const ids = (contactIds as unknown[]).filter((x): x is string => typeof x === "string");

    // Verify contacts belong to this workspace
    const contacts = await prisma.contact.findMany({
      where: { id: { in: ids }, workspaceId: ws.id },
      select: { id: true, name: true, firstName: true, metaUserId: true, isSubscribed: true },
    });
    if (contacts.length === 0) return badRequest("No valid contacts found");

    const page = await prisma.facebookPage.findFirst({
      where: { id: broadcast.pageId, workspaceId: ws.id },
      select: { pageId: true, accessToken: true, isActive: true },
    });
    if (!page) return badRequest("Associated Facebook Page not found");
    if (!page.isActive) return badRequest("The Facebook Page is not active");

    const plainToken = decryptToken(page.accessToken);

    // Send to each test contact — no DB state changes, no credit deduction
    const results: Array<{ contactId: string; name: string; success: boolean; error: string | null }> = [];

    for (const contact of contacts) {
      if (!contact.isSubscribed) {
        results.push({ contactId: contact.id, name: contact.name ?? contact.firstName ?? contact.id, success: false, error: "Contact is unsubscribed" });
        continue;
      }
      const result = await sendMessengerMessage(plainToken, page.pageId, contact.metaUserId, broadcast.message);
      results.push({
        contactId: contact.id,
        name: contact.name ?? contact.firstName ?? contact.id,
        success: !result.error,
        error: result.error,
      });
    }

    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return ok({ results, sent, failed, total: results.length });
  } catch (e) {
    console.error("[POST /api/broadcasts/[id]/test]", e);
    return serverError();
  }
}
