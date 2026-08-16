import { prisma } from "@/lib/db";
import { Users, Building2, Zap, Link2, Radio, MessageSquare, CreditCard, DollarSign, TrendingUp, UserPlus } from "lucide-react";
import Link from "next/link";

async function getStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    users, workspaces, pages, broadcasts, conversations,
    ledgers, recentLogs, invoiceStats, recentInvoices, recentSignups,
    activeSubs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.workspace.count(),
    prisma.facebookPage.count(),
    prisma.broadcast.count(),
    prisma.conversation.count(),
    prisma.creditLedger.aggregate({ _sum: { usedThisPeriod: true, monthlyAllocation: true } }),
    prisma.adminAuditLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { admin: { select: { name: true, email: true } } },
    }),
    prisma.invoice.aggregate({
      where: { status: "paid", paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      where: { status: "paid" },
      include: { workspace: { select: { name: true, user: { select: { email: true } } } } },
    }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.workspace.count({ where: { subscriptionStatus: "active" } }),
  ]);

  return {
    users, workspaces, pages, broadcasts, conversations,
    creditsConsumed: ledgers._sum.usedThisPeriod ?? 0,
    totalCreditsAllocated: ledgers._sum.monthlyAllocation ?? 0,
    recentLogs, recentInvoices,
    monthlyRevenue: (invoiceStats._sum.amount ?? 0) / 100,
    recentSignups,
    activeSubs,
  };
}

const STAT_CARDS = [
  { label: "Total Users",          key: "users",          icon: Users,        accent: "#6C63FF", href: "/admin/users",     fmt: "int" },
  { label: "Workspaces",           key: "workspaces",     icon: Building2,    accent: "#10B981", href: "/admin/workspaces",fmt: "int" },
  { label: "Active Subscriptions", key: "activeSubs",     icon: CreditCard,   accent: "#F59E0B", href: "/admin/workspaces",fmt: "int" },
  { label: "Revenue This Month",   key: "monthlyRevenue", icon: DollarSign,   accent: "#22D3EE", href: "/admin/payments",  fmt: "usd" },
  { label: "New Users (7d)",       key: "recentSignups",  icon: UserPlus,     accent: "#A78BFA", href: "/admin/users",     fmt: "int" },
  { label: "Connected Pages",      key: "pages",          icon: Link2,        accent: "#EC4899", href: "/admin/pages",     fmt: "int" },
  { label: "Total Broadcasts",     key: "broadcasts",     icon: Radio,        accent: "#FB923C", href: "/admin/broadcasts",fmt: "int" },
  { label: "Conversations",        key: "conversations",  icon: MessageSquare,accent: "#34D399", href: "/admin/conversations",fmt: "int" },
  { label: "Credits Consumed",     key: "creditsConsumed",icon: Zap,          accent: "#EF4444", href: "/admin/credits",   fmt: "int" },
  { label: "Credits Allocated",    key: "totalCreditsAllocated",icon: TrendingUp,accent: "#8B85FF",href: "/admin/credits", fmt: "int" },
] as const;

function formatTime(d: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

function fmtVal(val: number, fmt: string) {
  if (fmt === "usd") return `$${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return val.toLocaleString();
}

export default async function AdminDashboard() {
  const stats = await getStats();

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Admin Overview</h1>
        <p className="text-[13.5px]" style={{ color: "#8B95A7" }}>Platform-wide metrics and recent admin activity.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {STAT_CARDS.map(({ label, key, icon: Icon, accent, href, fmt }) => (
          <Link
            key={key}
            href={href}
            className="flex flex-col gap-3 p-5 rounded-xl transition-all hover:border-[rgba(255,255,255,0.14)]"
            style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${accent}15`, border: `1px solid ${accent}20` }}>
              <Icon size={16} style={{ color: accent }} />
            </div>
            <div>
              <div className="text-[22px] font-semibold leading-none mb-1" style={{ color: "#F5F7FA" }}>
                {fmtVal(stats[key] as number, fmt)}
              </div>
              <div className="text-[11.5px] font-medium" style={{ color: "#8B95A7" }}>{label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent Admin Actions */}
        <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <h2 className="text-[14px] font-semibold" style={{ color: "#F5F7FA" }}>Recent Admin Actions</h2>
            <Link href="/admin/audit-logs" className="text-[11px]" style={{ color: "#6C63FF" }}>View all →</Link>
          </div>
          {stats.recentLogs.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px]" style={{ color: "#8B95A7" }}>No admin actions yet.</div>
          ) : (
            <div>
              {stats.recentLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-4 px-5 py-3 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444" }}>
                    {(log.admin.name ?? log.admin.email)[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[12.5px] font-semibold" style={{ color: "#F5F7FA" }}>{log.action.replace(/_/g, " ")}</span>
                    {log.targetType && (
                      <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded" style={{ background: "rgba(108,99,255,0.1)", color: "#8B85FF" }}>{log.targetType}</span>
                    )}
                    <div className="text-[11px] mt-0.5" style={{ color: "#8B95A7" }}>by {log.admin.name ?? log.admin.email}</div>
                  </div>
                  <span className="text-[11px] shrink-0" style={{ color: "#8B95A7" }}>{formatTime(log.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <h2 className="text-[14px] font-semibold" style={{ color: "#F5F7FA" }}>Recent Payments</h2>
            <Link href="/admin/payments" className="text-[11px]" style={{ color: "#6C63FF" }}>View all →</Link>
          </div>
          {stats.recentInvoices.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px]" style={{ color: "#8B95A7" }}>No payments yet.</div>
          ) : (
            <div>
              {stats.recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center gap-4 px-5 py-3 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium truncate" style={{ color: "#F5F7FA" }}>
                      {inv.workspace.name}
                    </div>
                    <div className="text-[11px] truncate" style={{ color: "#8B95A7" }}>{inv.workspace.user.email}</div>
                  </div>
                  <div className="text-[13px] font-semibold shrink-0" style={{ color: "#10B981" }}>
                    ${(inv.amount / 100).toFixed(2)}
                  </div>
                  <span className="text-[11px] shrink-0" style={{ color: "#8B95A7" }}>{formatTime(inv.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
