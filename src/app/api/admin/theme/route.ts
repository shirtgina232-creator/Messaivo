import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { requireAdminOrError, logAdminAction } from "@/lib/admin-helpers";
import { ok, badRequest, serverError } from "@/lib/api-helpers";

export async function GET() {
  const [, err] = await requireAdminOrError();
  if (err) return err;

  try {
    const theme = await prisma.siteTheme.findUnique({ where: { id: "singleton" } });
    return ok({ theme });
  } catch (e) {
    console.error("[GET /api/admin/theme]", e);
    return serverError();
  }
}

export async function PUT(req: Request) {
  const [admin, err] = await requireAdminOrError();
  if (err) return err;

  try {
    const { userId: clerkId } = await auth();

    let body: unknown;
    try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }

    const b = body as Record<string, unknown>;
    const str = (key: string, fallback: string) =>
      typeof b[key] === "string" ? (b[key] as string) : fallback;
    const strOrNull = (key: string) =>
      typeof b[key] === "string" ? (b[key] as string) : null;

    const data = {
      brandName:          str("brandName",          "Messaivo"),
      logoUrl:            strOrNull("logoUrl"),
      primaryColor:       str("primaryColor",       "#6C63FF"),
      secondaryColor:     str("secondaryColor",     "#8B85FF"),
      accentColor:        str("accentColor",        "#22D3EE"),
      backgroundColor:    str("backgroundColor",    "#07090D"),
      surfaceColor:       str("surfaceColor",       "#101722"),
      borderColor:        str("borderColor",        "rgba(255,255,255,0.08)"),
      textColor:          str("textColor",          "#F5F7FA"),
      mutedTextColor:     str("mutedTextColor",     "#8B95A7"),
      fontFamily:         str("fontFamily",         "Geist"),
      buttonStyle:        str("buttonStyle",        "rounded"),
      borderRadius:       str("borderRadius",       "8"),
      landingHeading:     str("landingHeading",     "Customer Conversations, Organized"),
      landingDescription: str("landingDescription", ""),
      ctaText:            str("ctaText",            "Get started free"),
      announcementText:   strOrNull("announcementText"),
      footerContent:      strOrNull("footerContent"),
      updatedBy:          clerkId ?? null,
    };

    const theme = await prisma.siteTheme.upsert({
      where: { id: "singleton" },
      update: data,
      create: { id: "singleton", ...data },
    });

    await logAdminAction(admin.id, "UPDATE_THEME", "singleton", "theme", {
      fields: Object.keys(data),
    });

    return ok({ theme });
  } catch (e) {
    console.error("[PUT /api/admin/theme]", e);
    return serverError();
  }
}
