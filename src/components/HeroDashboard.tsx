"use client";

import { useState } from "react";
import {
  MessageSquare, Users, BarChart2, Radio, FileText,
  LayoutDashboard, ChevronRight, Circle, Check, Clock,
} from "lucide-react";

const conversations = [
  { id: 1, name: "Sarah Mitchell",  avatar: "SM", color: "#6C63FF", preview: "Hi! I saw your post about the new collection...", time: "2m",  unread: 2, status: "active",   page: "Bloom Fashion"  },
  { id: 2, name: "James Okafor",    avatar: "JO", color: "#22D3EE", preview: "Can I get more details on shipping to Lagos?",  time: "14m", unread: 0, status: "waiting",  page: "Urban Threads"  },
  { id: 3, name: "Priya Sharma",    avatar: "PS", color: "#10B981", preview: "The order arrived perfectly, thank you!",       time: "1h",  unread: 0, status: "resolved", page: "Bloom Fashion"  },
  { id: 4, name: "Carlos Vega",     avatar: "CV", color: "#F59E0B", preview: "Do you have this in size medium?",              time: "2h",  unread: 1, status: "active",   page: "Urban Threads"  },
  { id: 5, name: "Aiko Tanaka",     avatar: "AT", color: "#EC4899", preview: "Thank you for the quick response!",             time: "3h",  unread: 0, status: "resolved", page: "Bloom Fashion"  },
];

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: false, badge: 0 },
  { icon: MessageSquare,   label: "Inbox",     active: true,  badge: 3 },
  { icon: Users,           label: "Audience",  active: false, badge: 0 },
  { icon: Radio,           label: "Broadcasts",active: false, badge: 0 },
  { icon: FileText,        label: "Templates", active: false, badge: 0 },
  { icon: BarChart2,       label: "Analytics", active: false, badge: 0 },
];

const statusStyle = (s: string) =>
  s === "active"   ? { color: "#10B981", bg: "rgba(16,185,129,0.12)" }
  : s === "waiting"? { color: "#F59E0B", bg: "rgba(245,158,11,0.12)"  }
  :                  { color: "var(--muted)", bg: "var(--hover)"       };

export default function HeroDashboard() {
  const [selected, setSelected] = useState(1);
  const active = conversations.find((c) => c.id === selected)!;

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
                {item.badge > 0 && (
                  <span
                    className="ml-auto text-[10px] font-semibold hidden md:flex items-center justify-center w-4 h-4 rounded-full text-white"
                    style={{ background: "#6C63FF" }}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 px-2 hidden md:block">
            <div className="px-2 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)", opacity: 0.55 }}>
                Pages
              </span>
            </div>
            {["Bloom Fashion", "Urban Threads"].map((page) => (
              <div
                key={page}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all"
                style={{ color: "var(--muted)" }}
              >
                <div
                  className="w-4 h-4 rounded-sm shrink-0"
                  style={{ background: page === "Bloom Fashion" ? "rgba(108,99,255,0.45)" : "rgba(34,211,238,0.45)" }}
                />
                <span className="text-[11.5px] font-medium truncate">{page}</span>
              </div>
            ))}
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
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(108,99,255,0.12)", color: "#6C63FF" }}>5</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "var(--input-bg)" }}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--muted)" }} />
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: "var(--muted)" }} />
              </svg>
              <span className="text-[11px]" style={{ color: "var(--muted)" }}>Search conversations</span>
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelected(conv.id)}
                className="flex items-start gap-2.5 px-3 py-3 cursor-pointer transition-all duration-150 border-b"
                style={{
                  borderColor: "var(--border)",
                  background: selected === conv.id ? "var(--active-bg)" : "transparent",
                }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white" style={{ background: conv.color }}>
                  {conv.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11.5px] font-semibold" style={{ color: "var(--text)" }}>{conv.name}</span>
                    <span className="text-[10px] shrink-0 ml-1" style={{ color: "var(--muted)" }}>{conv.time}</span>
                  </div>
                  <p className="text-[10.5px] truncate leading-relaxed" style={{ color: "var(--muted)" }}>{conv.preview}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] font-medium" style={{ color: "rgba(108,99,255,0.75)" }}>{conv.page}</span>
                    {conv.unread > 0 && (
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: "#6C63FF" }}>{conv.unread}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: active.color }}>
              {active.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{active.name}</span>
                <span
                  className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                  style={{ background: statusStyle(active.status).bg, color: statusStyle(active.status).color }}
                >
                  <Circle size={5} fill="currentColor" />
                  {active.status === "active" ? "Active" : active.status === "waiting" ? "Waiting" : "Resolved"}
                </span>
              </div>
              <span className="text-[10.5px]" style={{ color: "var(--muted)" }}>{active.page}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
            <div className="flex justify-start">
              <div className="max-w-[70%] px-3 py-2 rounded-xl rounded-tl-sm text-[11.5px]" style={{ background: "var(--input-bg)", color: "var(--text)" }}>
                {active.preview}
              </div>
            </div>
            <div className="flex justify-end">
              <div className="max-w-[70%] px-3 py-2 rounded-xl rounded-tr-sm text-[11.5px] text-white" style={{ background: "#6C63FF" }}>
                Hi {active.name.split(" ")[0]}! Thanks for reaching out. Let me help you with that.
              </div>
            </div>
            <div className="flex items-center gap-1 self-end">
              <Check size={10} style={{ color: "#6C63FF" }} />
              <span className="text-[9.5px]" style={{ color: "var(--muted)" }}>Delivered</span>
            </div>
            <div className="flex justify-start mt-1">
              <div className="max-w-[70%] px-3 py-2 rounded-xl rounded-tl-sm text-[11.5px]" style={{ background: "var(--input-bg)", color: "var(--text)" }}>
                That would be great, thank you!
              </div>
            </div>
          </div>

          <div className="px-4 pb-4 pt-2 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
              style={{ background: "var(--input-bg)", border: "1px solid var(--border)" }}
            >
              <span className="text-[11.5px] flex-1" style={{ color: "var(--muted)" }}>Type a message...</span>
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "#6C63FF" }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M2 8l12-5-5 12-2-5-5-2z" fill="white" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Customer panel */}
        <div className="w-[200px] hidden lg:flex flex-col border-l shrink-0" style={{ borderColor: "var(--border)" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)", opacity: 0.55 }}>Customer</span>
          </div>
          <div className="px-4 py-4">
            <div className="flex flex-col items-center gap-2 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-[13px] font-bold text-white" style={{ background: active.color }}>
                {active.avatar}
              </div>
              <div className="text-center">
                <div className="text-[12.5px] font-semibold" style={{ color: "var(--text)" }}>{active.name}</div>
                <div className="text-[10.5px]" style={{ color: "var(--muted)" }}>via Messenger</div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <div className="text-[9.5px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--muted)", opacity: 0.55 }}>Last activity</div>
                <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--muted)" }}>
                  <Clock size={10} />{active.time} ago
                </div>
              </div>
              <div>
                <div className="text-[9.5px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)", opacity: 0.55 }}>Tags</div>
                <div className="flex flex-wrap gap-1">
                  {["Customer", "Active"].map((tag) => (
                    <span key={tag} className="text-[9.5px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(108,99,255,0.12)", color: "#6C63FF" }}>{tag}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[9.5px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)", opacity: 0.55 }}>Page</div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded-sm" style={{ background: active.page === "Bloom Fashion" ? "rgba(108,99,255,0.5)" : "rgba(34,211,238,0.5)" }} />
                  <span className="text-[11px]" style={{ color: "var(--muted)" }}>{active.page}</span>
                </div>
              </div>
              <div>
                <div className="text-[9.5px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)", opacity: 0.55 }}>Conversations</div>
                <div className="text-[11px] font-medium" style={{ color: "var(--text)" }}>3 total</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
