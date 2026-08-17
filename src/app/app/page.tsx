import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { MessageSquare, Users, Radio, CreditCard, Link2, Circle, Clock, ChevronRight, Activity, FileText } from "lucide-react";

function MetricCard({ label, value, sub, icon: Icon, accent, href }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent: string; href: string;
}) {
  return (
    <Link href={href} className="group flex flex-col gap-4 p-5 rounded-xl transition-all duration-200 hover:border-[rgba(255,255,255,0.14)]"
      style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${accent}15`, border: `1px solid ${accent}20` }}>
          <Icon size={16} style={{ color: accent }} />
        </div>
        <ChevronRight size={14} style={{ color: "#8B95A7" }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div>
        <div className="text-[26px] font-semibold leading-none mb-1" style={{ color: "#F5F7FA" }}>{typeof value === "number" ? value.toLocaleString() : value}</div>
        <div className="text-[12px] font-medium" style={{ color: "#8B95A7" }}>{label}</div>
        {sub && <div className="text-[11px] mt-0.5" style={{ color: "#8B95A7", opacity: 0.6 }}>{sub}</div>}
      </div>
    </Link>
  );
}

const statusColor = (s: string) =>
  s === "open"     ? { bg: "rgba(16,185,129,0.1)",  color: "#10B981" }
  : s === "assigned" ? { bg: "rgba(108,99,255,0.1)", color: "#8B85FF" }
  : { bg: "rgba(139,149,167,0.1)", color: "#8B95A7" };

export default async function DashboardPage() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const { userId: clerkId } = await auth();
  let firstName = "there";
  let credits = 0;
  let connectedPages = 0;
  let activeConversations = 0;
  let totalAudience = 0;
  let recentConvos: Array<{
    id: string; status: string; updatedAt: Date;
    contact: { name: string | null; metaUserId: string } | null;
    page: { pageName: string } | null;
  }> = [];
  let fbPages: Array<{ id: string; pageName: string; pageId: string; _count: { contacts: number } }> = [];
  let totalBroadcasts = 0;

  if (clerkId) {
    try {
      const userData = await prisma.user.findUnique({
        where: { clerkId },
        select: {
          name: true,
          workspace: {
            select: {
              id: true,
              _count: { select: { pages: true } },
              creditLedger: {
                select: { monthlyAllocation: true, bonusCredits: true, usedThisPeriod: true, unlimitedCredits: true },
              },
              pages: {
                select: { id: true, pageName: true, pageId: true, _count: { select: { contacts: true } } },
                where: { isActive: true },
                take: 5,
              },
            },
          },
        },
      });

      firstName = userData?.name?.split(" ")[0] ?? "there";
      const ws = userData?.workspace;
      if (ws) {
        connectedPages = ws._count.pages;
        fbPages = ws.pages;

        const ledger = ws.creditLedger;
        if (ledger) {
          credits = ledger.unlimitedCredits
            ? -1
            : ledger.monthlyAllocation + ledger.bonusCredits - ledger.usedThisPeriod;
          totalAudience = ws.pages.reduce((s, p) => s + p._count.contacts, 0);
        }

        const [convCount, broadcastCount, convRows] = await Promise.all([
          prisma.conversation.count({ where: { workspaceId: ws.id, status: "OPEN" } }),
          prisma.broadcast.count({ where: { workspaceId: ws.id } }),
          prisma.conversation.findMany({
            where: { workspaceId: ws.id },
            orderBy: { updatedAt: "desc" },
            take: 5,
            select: {
              id: true, status: true, updatedAt: true,
              contact: { select: { name: true, metaUserId: true } },
              page: { select: { pageName: true } },
            },
          }),
        ]);
        activeConversations = convCount;
        totalBroadcasts = broadcastCount;
        recentConvos = convRows;
      }
    } catch (e) {
      console.error("[Dashboard] stats fetch failed:", e);
    }
  }

  const creditsDisplay = credits === -1 ? "Unlimited" : credits.toLocaleString();

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-[13.5px]" style={{ color: "#8B95A7" }}>Here&apos;s what&apos;s happening across your connected Pages.</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        <MetricCard label="Connected Pages"      value={connectedPages}      icon={Link2}         accent="#6C63FF" href="/app/pages"     />
        <MetricCard label="Active Conversations" value={activeConversations}  icon={MessageSquare} accent="#22D3EE" href="/app/inbox"     />
        <MetricCard label="Total Audience"       value={totalAudience}        icon={Users}         accent="#10B981" href="/app/audience"  />
        <MetricCard label="Broadcasts"           value={totalBroadcasts}      icon={Radio}         accent="#F59E0B" href="/app/broadcasts"/>
        <MetricCard label="Credits Remaining"    value={creditsDisplay}       icon={CreditCard}    accent="#EC4899" href="/app/credits"   />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent conversations */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-semibold" style={{ color: "#F5F7FA" }}>Recent Conversations</h2>
            <Link href="/app/inbox" className="text-[12px] font-medium flex items-center gap-1 transition-colors" style={{ color: "#6C63FF" }}>
              View all <ChevronRight size={12} />
            </Link>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
              {["Customer", "Page", "Activity", "Status"].map(h => (
                <span key={h} className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7", opacity: 0.6 }}>{h}</span>
              ))}
            </div>
            {recentConvos.length === 0 ? (
              <div className="px-4 py-8 text-center text-[13px]" style={{ color: "#8B95A7" }}>
                No conversations yet — connect a Facebook Page to get started.
              </div>
            ) : recentConvos.map(c => {
              const displayName = c.contact?.name ?? c.contact?.metaUserId ?? "Unknown";
              const initials = displayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
              const ago = (() => {
                const diff = Date.now() - c.updatedAt.getTime();
                const m = Math.floor(diff / 60000);
                if (m < 60) return `${m}m`;
                const h = Math.floor(m / 60);
                if (h < 24) return `${h}h`;
                return `${Math.floor(h / 24)}d`;
              })();
              return (
                <Link
                  key={c.id}
                  href="/app/inbox"
                  className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 px-4 py-3 border-b items-center transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                  style={{ borderColor: "rgba(255,255,255,0.04)" }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ background: "#6C63FF" }}>{initials}</div>
                    <span className="text-[12.5px] font-medium truncate" style={{ color: "#F5F7FA" }}>{displayName}</span>
                  </div>
                  <span className="text-[11px] truncate" style={{ color: "#8B95A7" }}>{c.page?.pageName?.split(" ")[0] ?? "—"}</span>
                  <div className="flex items-center gap-1 text-[11px]" style={{ color: "#8B95A7" }}>
                    <Clock size={10} />{ago}
                  </div>
                  <div className="flex">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize" style={{ background: statusColor(c.status.toLowerCase()).bg, color: statusColor(c.status.toLowerCase()).color }}>
                      {c.status.toLowerCase()}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Connected Pages */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold" style={{ color: "#F5F7FA" }}>Connected Pages</h2>
              <Link href="/app/pages" className="text-[12px] font-medium flex items-center gap-1" style={{ color: "#6C63FF" }}>
                Manage <ChevronRight size={12} />
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              {fbPages.length === 0 ? (
                <div className="p-4 rounded-xl text-center text-[12.5px]" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.07)", color: "#8B95A7" }}>
                  No pages connected yet.{" "}
                  <Link href="/app/pages" style={{ color: "#6C63FF" }}>Connect a Page →</Link>
                </div>
              ) : fbPages.map(page => {
                const color = ["#6C63FF","#22D3EE","#10B981","#F59E0B","#EC4899"][(page.pageName.charCodeAt(0) ?? 0) % 5];
                const avatar = page.pageName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <div key={page.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: color }}>{avatar}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-semibold truncate" style={{ color: "#F5F7FA" }}>{page.pageName}</div>
                      <div className="text-[11px]" style={{ color: "#8B95A7" }}>{page._count.contacts.toLocaleString()} audience</div>
                    </div>
                    <div className="flex items-center gap-1 text-[10.5px]" style={{ color: "#10B981" }}>
                      <Circle size={5} fill="currentColor" /> Active
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="text-[14px] font-semibold mb-4" style={{ color: "#F5F7FA" }}>Recent Activity</h2>
            <div className="flex flex-col gap-2">
              {recentConvos.slice(0, 4).map(c => {
                const displayName = c.contact?.name ?? c.contact?.metaUserId ?? "Unknown";
                return (
                  <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(108,99,255,0.12)" }}>
                      <Activity size={12} style={{ color: "#6C63FF" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold" style={{ color: "#F5F7FA" }}>New conversation</div>
                      <div className="text-[11px] leading-snug mt-0.5" style={{ color: "#8B95A7" }}>
                        {displayName} on {c.page?.pageName ?? "Unknown Page"}
                      </div>
                    </div>
                  </div>
                );
              })}
              {recentConvos.length === 0 && (
                <div className="p-3 rounded-xl text-[12px] text-center" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.07)", color: "#8B95A7" }}>
                  No activity yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
