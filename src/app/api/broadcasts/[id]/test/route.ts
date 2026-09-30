import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, badRequest, notFound, ok } from "@/lib/api-helpers";
import { prepareBroadcast } from "@/lib/broadcast-policy";
import { deliverRecipient } from "@/lib/broadcast-delivery";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ws = await getWorkspace(); if (!ws) return unauthorized();
  try {
    const { id } = await params;
    const broadcast = await prisma.broadcast.findFirst({ where: { id, workspaceId: ws.id } });
    if (!broadcast) return notFound();
    if (!["draft", "scheduled"].includes(broadcast.status)) return badRequest("Test Send requires a draft");
    const key = req.headers.get("idempotency-key");
    if (!key || !/^[a-zA-Z0-9_-]{16,100}$/.test(key)) return badRequest("A unique Idempotency-Key header is required");
    const { contactIds } = await req.json();
    if (!Array.isArray(contactIds) || contactIds.length < 1 || contactIds.length > 5 || contactIds.some(x => typeof x !== "string")) return badRequest("Choose 1–5 contacts");
    const contacts = await prisma.contact.findMany({ where: { id: { in: contactIds }, workspaceId: ws.id, pageId: broadcast.pageId } });
    if (contacts.length !== new Set(contactIds).size) return badRequest("Selection contains unavailable or wrong-Page contacts");
    const prepared = await prepareBroadcast(broadcast);
    const results = [];
    for (const contact of contacts) {
      try { results.push({ contactId: contact.id, name: contact.name, ...await deliverRecipient(broadcast, contact, prepared, "test:" + id + ":" + key + ":" + contact.id) }); }
      catch (error) { results.push({ contactId: contact.id, name: contact.name, success: false, error: error instanceof Error ? error.message : "Test failed" }); }
    }
    return ok({ results, sent: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length, total: results.length });
  } catch (error) { return badRequest(error instanceof Error ? error.message : "Test failed"); }
}
