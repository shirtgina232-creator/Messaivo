import { prisma } from "@/lib/db";
import OffersManager from "./_components/OffersManager";

export default async function AdminOffersPage() {
  const offers = await prisma.offer.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Offers</h1>
        <p className="text-[13px]" style={{ color: "#8B95A7" }}>Promotional discounts and coupon codes. FINANCE or SUPER_ADMIN only.</p>
      </div>
      <OffersManager initialOffers={offers} />
    </div>
  );
}
