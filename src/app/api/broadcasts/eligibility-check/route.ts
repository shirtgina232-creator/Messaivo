import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, badRequest, serverError, ok } from "@/lib/api-helpers";

export async function POST(req: Request) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const { pageId, contactIds } = body as Record<string, unknown>;

    if (!pageId || typeof pageId !== "string") return badRequest("pageId is required");

    const page = await prisma.facebookPage.findFirst({
      where: { id: pageId, workspaceId: ws.id },
      select: { id: true },
    });
    if (!page) return badRequest("Page not found");

    const windowCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    let contacts: Array<{ isSubscribed: boolean; lastMessageAt: Date | null }>;

    if (Array.isArray(contactIds) && contactIds.length > 0) {
      const ids = (contactIds as unknown[]).filter((x): x is string => typeof x === "string");
      contacts = await prisma.contact.findMany({
        where: { id: { in: ids }, workspaceId: ws.id },
        select: { isSubscribed: true, lastMessageAt: true },
      });
    } else {
      contacts = await prisma.contact.findMany({
        where: { pageId, workspaceId: ws.id },
        select: { isSubscribed: true, lastMessageAt: true },
      });
    }

    let eligible = 0;
    let ineligible = 0;
    let skipped = 0;

    for (const c of contacts) {
      if (!c.isSubscribed) {
        skipped++;
      } else if (!c.lastMessageAt || c.lastMessageAt < windowCutoff) {
        ineligible++;
      } else {
        eligible++;
      }
    }

    return ok({ total: contacts.length, eligible, ineligible, skipped });
  } catch (e) {
    console.error("[POST /api/broadcasts/eligibility-check]", e);
    return serverError();
  }
}
