import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, badRequest, serverError, ok, created } from "@/lib/api-helpers";

export async function GET(req: Request) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const url = new URL(req.url);
    const search = url.searchParams.get("search") ?? "";

    const groups = await prisma.contactGroup.findMany({
      where: {
        workspaceId: ws.id,
        ...(search && { name: { contains: search, mode: "insensitive" } }),
      },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: "desc" },
    });

    return ok({ groups });
  } catch (e) {
    console.error("[GET /api/groups]", e);
    return serverError();
  }
}

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

    const { name, description, color } = body as Record<string, unknown>;
    if (!name || typeof name !== "string" || !name.trim()) {
      return badRequest("name is required");
    }

    const group = await prisma.contactGroup.create({
      data: {
        workspaceId: ws.id,
        name: name.trim(),
        description: typeof description === "string" ? description : null,
        color: typeof color === "string" ? color : null,
      },
    });

    return created({ group });
  } catch (e) {
    console.error("[POST /api/groups]", e);
    return serverError();
  }
}
