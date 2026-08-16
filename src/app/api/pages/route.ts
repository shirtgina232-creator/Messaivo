import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, badRequest, serverError, ok, created } from "@/lib/api-helpers";

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
} as const;

export async function GET() {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const pages = await prisma.facebookPage.findMany({
      where: { workspaceId: ws.id },
      select: PAGE_SELECT,
      orderBy: { createdAt: "desc" },
    });

    return ok({ pages });
  } catch (e) {
    console.error("[GET /api/pages]", e);
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    // Meta credentials must be configured before connecting a page
    if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
      return badRequest(
        "Meta credentials are not configured. Set META_APP_ID and META_APP_SECRET in .env.local before connecting a page."
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const { pageId, pageName, accessToken, pageCategory, pageAvatar } =
      body as Record<string, unknown>;

    if (!pageId || typeof pageId !== "string") return badRequest("pageId is required");
    if (!pageName || typeof pageName !== "string") return badRequest("pageName is required");
    if (!accessToken || typeof accessToken !== "string") return badRequest("accessToken is required");

    const page = await prisma.facebookPage.upsert({
      where: { workspaceId_pageId: { workspaceId: ws.id, pageId } },
      update: {
        pageName,
        accessToken,
        pageCategory: typeof pageCategory === "string" ? pageCategory : undefined,
        pageAvatar: typeof pageAvatar === "string" ? pageAvatar : undefined,
        isActive: true,
        lastSyncedAt: new Date(),
      },
      create: {
        workspaceId: ws.id,
        pageId,
        pageName,
        accessToken,
        pageCategory: typeof pageCategory === "string" ? pageCategory : null,
        pageAvatar: typeof pageAvatar === "string" ? pageAvatar : null,
      },
      select: PAGE_SELECT,
    });

    return created({ page });
  } catch (e) {
    console.error("[POST /api/pages]", e);
    return serverError();
  }
}
