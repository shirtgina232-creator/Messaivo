import { prisma } from "@/lib/db";
import ContentForm from "./_components/ContentForm";

export default async function AdminContentPage() {
  const content = await prisma.siteContent.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      loginHeading: "Welcome back", loginDescription: "Sign in to your Messaivo workspace.",
      signupHeading: "Create your account", signupDescription: "Start managing customer conversations today.",
      dashboardHeading: "Welcome to Messaivo", dashboardDescription: "Manage your customer conversations from one place.",
      supportText: "Need help? Contact our support team.", supportEmail: "",
      footerText: "© 2025 Messaivo. All rights reserved.", copyrightText: "© 2025 Messaivo",
    },
    update: {},
  });
  return (
    <div className="p-6 max-w-[900px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Site Content</h1>
        <p className="text-[13px]" style={{ color: "#8B95A7" }}>Customize headings, descriptions, and copy across the platform.</p>
      </div>
      <ContentForm initial={content} />
    </div>
  );
}
