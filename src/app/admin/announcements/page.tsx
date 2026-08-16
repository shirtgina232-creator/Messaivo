import { prisma } from "@/lib/db";
import AnnouncementsManager from "./_components/AnnouncementsManager";

export default async function AdminAnnouncementsPage() {
  const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Announcements</h1>
        <p className="text-[13px]" style={{ color: "#8B95A7" }}>Customer-facing announcements displayed in the app.</p>
      </div>
      <AnnouncementsManager initialAnnouncements={announcements} />
    </div>
  );
}
