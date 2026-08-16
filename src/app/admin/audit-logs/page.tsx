import { prisma } from "@/lib/db";
import AuditLogsClient from "./_components/AuditLogsClient";

export default async function AdminAuditLogsPage() {
  const [logs, actionTypes] = await Promise.all([
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { admin: { select: { name: true, email: true } } },
    }),
    prisma.adminAuditLog.groupBy({
      by: ["action"],
      orderBy: { action: "asc" },
    }),
  ]);

  const types = actionTypes.map((a) => a.action);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Audit Logs</h1>
        <p className="text-[13px]" style={{ color: "#8B95A7" }}>All significant admin actions, newest first.</p>
      </div>
      <AuditLogsClient initialLogs={logs} actionTypes={types} />
    </div>
  );
}
