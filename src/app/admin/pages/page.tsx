import { prisma } from "@/lib/db";
import { Circle } from "lucide-react";

export default async function AdminPagesPage() {
  const pages = await prisma.facebookPage.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      workspace: { select: { name: true, user: { select: { email: true } } } },
      _count: { select: { conversations: true, contacts: true } },
    },
  });

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Facebook Pages</h1>
        <p className="text-[13px]" style={{ color: "#8B95A7" }}>All connected Facebook Pages across all workspaces.</p>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div
          className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-3 px-5 py-3 border-b"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
        >
          {["Page Name", "Workspace / Owner", "Contacts", "Conversations", "Status"].map((h) => (
            <span key={h} className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>{h}</span>
          ))}
        </div>
        {pages.map((p) => (
          <div
            key={p.id}
            className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-3 px-5 py-3.5 border-b last:border-0 items-center"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}
          >
            <div className="text-[13px] font-medium truncate" style={{ color: "#F5F7FA" }}>{p.pageName}</div>
            <div className="min-w-0">
              <div className="text-[12.5px] truncate" style={{ color: "#8B95A7" }}>{p.workspace.name}</div>
              <div className="text-[11px] truncate" style={{ color: "#8B95A7", opacity: 0.7 }}>{p.workspace.user.email}</div>
            </div>
            <div className="text-[12.5px]" style={{ color: "#8B95A7" }}>{p._count.contacts.toLocaleString()}</div>
            <div className="text-[12.5px]" style={{ color: "#8B95A7" }}>{p._count.conversations.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-[11.5px]" style={{ color: p.isActive ? "#10B981" : "#8B95A7" }}>
              <Circle size={6} fill="currentColor" />
              {p.isActive ? "Active" : "Inactive"}
            </div>
          </div>
        ))}
        {pages.length === 0 && (
          <div className="px-5 py-10 text-center text-[13px]" style={{ color: "#8B95A7" }}>No pages connected yet.</div>
        )}
      </div>
    </div>
  );
}
