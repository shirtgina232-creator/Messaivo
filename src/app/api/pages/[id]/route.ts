import { prisma } from "@/lib/db";
import {
  getWorkspace, unauthorized, notFound, badRequest, serverError, ok, noContent,
} from "@/lib/api-helpers";
import { decryptToken } from "@/lib/token-crypto";
import { subscribePageToWebhook } from "@/lib/meta-graph";

// Fields returned to the client — accessToken is intentionally excluded
const PAGE_SELECT = {
  id: true,
  pageId: true,
  pageName: true,
  pageCategory: true,
  pageAvatar: true,
  instagramAccountId: true,
  instagramUsername: true,
  isActive: true,
  webhookSubscribed: true,
  lastSyncedAt: true,
  scanStatus: true,
  lastScannedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const { id } = await params;
    const page = await prisma.facebookPage.findFirst({
      where: { id, workspaceId: ws.id },
      select: PAGE_SELECT,
    });

    if (!page) return notFound("Page not found");
    return ok({ page });
  } catch (e) {
    console.error("[GET /api/pages/[id]]", e);
    return serverError();
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const { id } = await params;
    const existing = await prisma.facebookPage.findFirst({
      where: { id, workspaceId: ws.id },
      select: { id: true, pageId: true, accessToken: true, isActive: true, webhookSubscribed: true },
    });
    if (!existing) return notFound("Page not found");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const { isActive, pageName } = body as Record<string, unknown>;

    const updated = await prisma.facebookPage.update({
      where: { id },
      data: {
        ...(typeof isActive === "boolean" && { isActive }),
        ...(typeof pageName === "string" && pageName.trim() && { pageName: pageName.trim() }),
      },
      select: { ...PAGE_SELECT, accessToken: true },
    });

    // When a page is activated for the first time (or re-activated without a webhook subscription),
    // subscribe it to the required Messenger webhook fields.
    if (isActive === true && !existing.webhookSubscribed) {
      try {
        const plainToken = decryptToken(updated.accessToken);
        const result = await subscribePageToWebhook(plainToken, existing.pageId);
        if (result.success) {
          await prisma.facebookPage.update({
            where: { id },
            data: { webhookSubscribed: true },
          });
        } else {
          // Non-fatal: page is activated but webhook subscription failed.
          // User may need to complete Meta App Review or set META_APP_SECRET.
          console.warn(
            `[pages/[id]] Webhook subscription failed for page ${existing.pageId}: ${result.error}`
          );
        }
      } catch (err) {
        console.warn("[pages/[id]] Error subscribing page to webhook:", err);
      }
    }

    // Return page without accessToken
    const { accessToken: _omit, ...pageForClient } = updated;
    return ok({ page: pageForClient });
  } catch (e) {
    console.error("[PATCH /api/pages/[id]]", e);
    return serverError();
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const { id } = await params;
    const existing = await prisma.facebookPage.findFirst({
      where: { id, workspaceId: ws.id },
      select: { id: true },
    });
    if (!existing) return notFound("Page not found");

    await prisma.facebookPage.delete({ where: { id } });
    return noContent();
  } catch (e) {
    console.error("[DELETE /api/pages/[id]]", e);
    return serverError();
  }
}
