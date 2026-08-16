import { prisma } from "@/lib/db";
import BrandingForm from "./_components/BrandingForm";

export default async function AdminBrandingPage() {
  const branding = await prisma.siteBranding.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton", brandName: "Messaivo", browserTitle: "Messaivo",
      supportEmail: "", companyName: "Messaivo",
    },
    update: {},
  });
  return (
    <div className="p-6 max-w-[900px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Branding</h1>
        <p className="text-[13px]" style={{ color: "#8B95A7" }}>Manage site branding, logos, and company identity.</p>
      </div>
      <BrandingForm initial={branding} />
    </div>
  );
}
