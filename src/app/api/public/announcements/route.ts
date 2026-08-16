import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const now = new Date();
    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        AND: [
          {
            OR: [
              { startDate: null },
              { startDate: { lte: now } },
            ],
          },
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } },
            ],
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true, title: true, message: true, type: true,
        ctaText: true, ctaUrl: true, isDismissible: true,
      },
    });
    return NextResponse.json({ announcements });
  } catch (e) {
    console.error("[GET /api/public/announcements]", e);
    return NextResponse.json({ announcements: [] });
  }
}
