import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true, slug: true, name: true, description: true,
        monthlyPrice: true, yearlyPrice: true, monthlyCredits: true,
        features: true, isRecommended: true, displayOrder: true,
        premiumInbox: true,
      },
    });
    return NextResponse.json({ plans });
  } catch (e) {
    console.error("[GET /api/public/plans]", e);
    return NextResponse.json({ plans: [] });
  }
}
