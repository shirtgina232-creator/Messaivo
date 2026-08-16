import { prisma } from "@/lib/db";
import {
  getWorkspace, unauthorized, notFound, badRequest, serverError, ok, noContent,
} from "@/lib/api-helpers";

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
  lastSyncedAt: true,
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
      select: { id: true },
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
      select: PAGE_SELECT,
    });

    return ok({ page: updated });
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
