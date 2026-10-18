import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, badRequest, serverError, ok } from "@/lib/api-helpers";

// Fields returned to the client — accessToken is intentionally excluded
const PAGE_SELECT = {
  id: true,
  pageId: true,
  pageName: true,
  pageCategory: true,
  pageAvatar: true,
  instagramAccountId: true,
  instagramUsername: true,
  utilityPermissionGranted: true,
  permissionsCheckedAt: true,
  permissionError: true,
  isActive: true,
  lastSyncedAt: true,
  scanStatus: true,
  lastScannedAt: true,
  createdAt: true,
  _count: { select: { contacts: true } },
} as const;

export async function GET(req: Request) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const url = new URL(req.url);
    const activeOnly = url.searchParams.get("activeOnly") === "true";

    const pages = await prisma.facebookPage.findMany({
      where: {
        workspaceId: ws.id,
        ...(activeOnly ? { isActive: true } : {}),
      },
      select: PAGE_SELECT,
      orderBy: { createdAt: "desc" },
    });

    return ok({ pages });
  } catch (e) {
    console.error("[GET /api/pages]", e);
    return serverError();
  }
}

export async function POST() { const ws = await getWorkspace(); if (!ws) return unauthorized(); return badRequest("Connect Pages through Facebook OAuth so Page ownership and grants can be verified"); }
