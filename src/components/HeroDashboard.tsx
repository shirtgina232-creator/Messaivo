"use client";

import {
  MessageSquare, Users, BarChart2, Radio, FileText,
  LayoutDashboard, ChevronRight,
} from "lucide-react";

function FbIcon({ size = 16, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: false, badge: 0 },
  { icon: MessageSquare,   label: "Inbox",     active: true,  badge: 0 },
  { icon: Users,           label: "Audience",  active: false, badge: 0 },
  { icon: Radio,           label: "Broadcasts",active: false, badge: 0 },
  { icon: FileText,        label: "Templates", active: false, badge: 0 },
  { icon: BarChart2,       label: "Analytics", active: false, badge: 0 },
];

export default function HeroDashboard() {
  return (
    <div
      className="w-full rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-2, var(--bg))",
        border: "1px solid var(--border-md)",
        boxShadow: "var(--shadow-float)",
      }}
    >
      {/* Browser chrome */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      >
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: "rgba(239,68,68,0.5)" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "rgba(245,158,11,0.5)" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "rgba(34,197,94,0.5)" }} />
        </div>
        <div
          className="flex-1 mx-4 max-w-xs h-6 rounded-md flex items-center px-3"
          style={{ background: "var(--input-bg)" }}
        >
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>
            app.messaivo.com/inbox
          </span>
        </div>
      </div>

      {/* App body */}
      <div className="flex h-[420px] md:h-[500px]">
        {/* Sidebar */}
        <div
          className="w-[52px] md:w-[200px] flex flex-col py-4 shrink-0 border-r"
          style={{ background: "var(--bg)", borderColor: "var(--border)" }}
        >
          {/* Workspace */}
          <div className="px-3 mb-4 hidden md:block">
            <div
              className="flex items-center gap-2 px-2 py-2 rounded-lg"
              style={{ background: "var(--active-bg)" }}
            >
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: "#6C63FF" }}>
                <span className="text-[10px] font-bold text-white">M</span>
              </div>
              <span className="text-[12px] font-medium truncate" style={{ color: "var(--text)" }}>My Workspace</span>
              <ChevronRight size={12} className="ml-auto" style={{ color: "var(--muted)" }} />
            </div>
          </div>

          <div className="flex flex-col gap-0.5 px-2">
            {sidebarItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-all duration-150"
                style={{
                  background: item.active ? "rgba(108,99,255,0.12)" : "transparent",
                  color: item.active ? "var(--text)" : "var(--muted)",
                }}
              >
                <item.icon size={15} className="shrink-0" />
                <span className="text-[12.5px] font-medium hidden md:block">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 px-2 hidden md:block">
            <div className="px-2 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)", opacity: 0.55 }}>
                Pages
              </span>
            </div>
            <div
              className="flex items-center gap-2 px-2 py-2 rounded-lg"
              style={{ color: "var(--muted)", background: "rgba(108,99,255,0.06)" }}
            >
              <FbIcon size={12} style={{ color: "#6C63FF" }} />
              <span className="text-[11px] font-medium truncate" style={{ color: "var(--muted)" }}>Connect a Page</span>
            </div>
          </div>
        </div>

        {/* Conversation list */}
        <div
          className="w-[180px] md:w-[260px] flex flex-col border-r shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Conversations</h3>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(108,99,255,0.12)", color: "#6C63FF" }}>0</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "var(--input-bg)" }}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--muted)" }} />
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: "var(--muted)" }} />
              </svg>
              <span className="text-[11px]" style={{ color: "var(--muted)" }}>Search conversations</span>
            </div>
          </div>
          {/* Empty state */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(108,99,255,0.1)" }}>
              <MessageSquare size={18} style={{ color: "#6C63FF" }} />
            </div>
            <div>
              <p className="text-[12px] font-medium" style={{ color: "var(--text)" }}>No conversations yet</p>
              <p className="text-[10.5px] mt-0.5" style={{ color: "var(--muted)" }}>Connect a Facebook Page to start receiving messages</p>
            </div>
          </div>
        </div>

        {/* Main area – onboarding empty state */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5 min-w-0">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(108,99,255,0.12)", border: "1px solid rgba(108,99,255,0.25)" }}
          >
            <FbIcon size={26} style={{ color: "#6C63FF" }} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold mb-1.5" style={{ color: "var(--text)" }}>Connect your Facebook Page</h3>
            <p className="text-[12px] leading-relaxed max-w-xs" style={{ color: "var(--muted)" }}>
              Link a Facebook Page to manage all your Messenger conversations and audience in one place.
            </p>
          </div>
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12.5px] font-medium text-white"
            style={{ background: "#6C63FF" }}
          >
            <FbIcon size={14} />
            Continue with Facebook
          </div>
        </div>
      </div>
    </div>
  );
}
