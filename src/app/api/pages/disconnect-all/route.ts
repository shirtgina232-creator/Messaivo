import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, ok, serverError } from "@/lib/api-helpers";

export async function POST(_req: Request) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const result = await prisma.facebookPage.updateMany({
      where: { workspaceId: ws.id, isActive: true },
      data: { isActive: false, utilityPermissionGranted: false },
    });

    return ok({ disconnected: result.count });
  } catch (e) {
    console.error("[POST /api/pages/disconnect-all]", e);
    return serverError();
  }
}
