"use client";

import { useState } from "react";
import {
  MessageSquare,
  Users,
  Radio,
  BarChart2,
  Circle,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

const tabs = [
  { id: "inbox", label: "Inbox", icon: MessageSquare },
  { id: "audience", label: "Audience", icon: Users },
  { id: "broadcasts", label: "Broadcasts", icon: Radio },
  { id: "analytics", label: "Analytics", icon: BarChart2 },
];

// Inbox tab content
function InboxDemo() {
  const [active, setActive] = useState(0);
  const convos = [
    { name: "Sarah Mitchell", avatar: "SM", color: "#6C63FF", msg: "Hi! I saw your post about the new collection. Is it still available?", time: "2m", unread: 2, status: "active", page: "Bloom Fashion" },
    { name: "James Okafor", avatar: "JO", color: "#22D3EE", msg: "Can I get more details on shipping to Lagos?", time: "14m", unread: 0, status: "waiting", page: "Urban Threads" },
    { name: "Priya Sharma", avatar: "PS", color: "#10B981", msg: "The order arrived perfectly, thank you so much!", time: "1h", unread: 0, status: "resolved", page: "Bloom Fashion" },
    { name: "Carlos Vega", avatar: "CV", color: "#F59E0B", msg: "Do you have this in size medium?", time: "2h", unread: 1, status: "active", page: "Urban Threads" },
    { name: "Aiko Tanaka", avatar: "AT", color: "#EC4899", msg: "Thank you for the quick response!", time: "3h", unread: 0, status: "resolved", page: "Bloom Fashion" },
  ];
  const selectedConvo = convos[active];
  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 border-r flex flex-col" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold text-[#F5F7FA]">Conversations</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "rgba(108,99,255,0.12)", color: "#6C63FF" }}>5</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
            <Search size={10} className="text-[#8B95A7]" />
            <span className="text-[11px] text-[#8B95A7]">Search...</span>
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {convos.map((c, i) => (
            <div
              key={i}
              onClick={() => setActive(i)}
              className={`flex items-start gap-2.5 px-3 py-3 cursor-pointer border-b transition-colors ${active === i ? "bg-[rgba(108,99,255,0.07)]" : "hover:bg-[rgba(255,255,255,0.02)]"}`}
              style={{ borderColor: "rgba(255,255,255,0.04)" }}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: c.color }}>{c.avatar}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] font-semibold text-[#F5F7FA]">{c.name}</span>
                  <span className="text-[9.5px] text-[#8B95A7]">{c.time}</span>
                </div>
                <p className="text-[10.5px] text-[#8B95A7] truncate">{c.msg}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[9px] flex items-center gap-1 font-medium" style={{ color: c.status === "active" ? "#10B981" : c.status === "waiting" ? "#F59E0B" : "#8B95A7" }}>
                    <Circle size={4} fill="currentColor" />{c.status}
                  </span>
                  {c.unread > 0 && (
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ background: "#6C63FF" }}>{c.unread}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: selectedConvo.color }}>{selectedConvo.avatar}</div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-[#F5F7FA]">{selectedConvo.name}</span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: selectedConvo.status === "active" ? "rgba(16,185,129,0.12)" : selectedConvo.status === "waiting" ? "rgba(245,158,11,0.12)" : "rgba(139,149,167,0.12)", color: selectedConvo.status === "active" ? "#10B981" : selectedConvo.status === "waiting" ? "#F59E0B" : "#8B95A7" }}>
                {selectedConvo.status}
              </span>
            </div>
            <span className="text-[10.5px] text-[#8B95A7]">{selectedConvo.page}</span>
          </div>
        </div>
        <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
          <div className="self-start">
            <div className="px-3 py-2 rounded-xl rounded-tl-sm text-[12px] text-[#F5F7FA] max-w-xs" style={{ background: "rgba(255,255,255,0.06)" }}>{selectedConvo.msg}</div>
          </div>
          <div className="self-end">
            <div className="px-3 py-2 rounded-xl rounded-tr-sm text-[12px] text-white max-w-xs" style={{ background: "#6C63FF" }}>
              Hi {selectedConvo.name.split(" ")[0]}! Thanks for reaching out. I&apos;d be happy to help you with that.
            </div>
          </div>
          <div className="self-start">
            <div className="px-3 py-2 rounded-xl rounded-tl-sm text-[12px] text-[#F5F7FA] max-w-xs" style={{ background: "rgba(255,255,255,0.06)" }}>That would be great, thank you so much!</div>
          </div>
        </div>
        <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <span className="flex-1 text-[11.5px] text-[#8B95A7]">Reply to {selectedConvo.name.split(" ")[0]}...</span>
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "#6C63FF" }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 8l12-5-5 12-2-5-5-2z" fill="white" /></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Audience tab content
function AudienceDemo() {
  const customers = [
    { name: "Sarah Mitchell", page: "Bloom Fashion", tag: "VIP", status: "Active", convos: 12, last: "Today" },
    { name: "James Okafor", page: "Urban Threads", tag: "Lead", status: "New", convos: 1, last: "Yesterday" },
    { name: "Priya Sharma", page: "Bloom Fashion", tag: "Customer", status: "Active", convos: 7, last: "3 days ago" },
    { name: "Carlos Vega", page: "Urban Threads", tag: "Customer", status: "Inactive", convos: 3, last: "1 week ago" },
    { name: "Aiko Tanaka", page: "Bloom Fashion", tag: "VIP", status: "Active", convos: 18, last: "Today" },
  ];
  const colors = ["#6C63FF", "#22D3EE", "#10B981", "#F59E0B", "#EC4899"];
  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-semibold text-[#F5F7FA]">Your Audience</h3>
          <p className="text-[11.5px] text-[#8B95A7]">1,247 total customers across 2 pages</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-[#8B95A7]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Filter size={11} />All pages
          </button>
        </div>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="grid grid-cols-6 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#8B95A7]/50" style={{ background: "rgba(255,255,255,0.02)" }}>
          <span className="col-span-2">Name</span>
          <span>Page</span>
          <span>Tag</span>
          <span>Convos</span>
          <span>Last active</span>
        </div>
        {customers.map((c, i) => (
          <div key={i} className="grid grid-cols-6 items-center px-4 py-3 border-t hover:bg-[rgba(255,255,255,0.02)] cursor-pointer transition-colors" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            <div className="col-span-2 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: colors[i] }}>
                {c.name.split(" ").map(n => n[0]).join("")}
              </div>
              <span className="text-[11.5px] font-medium text-[#F5F7FA]">{c.name}</span>
            </div>
            <span className="text-[11px] text-[#8B95A7]">{c.page.split(" ")[0]}</span>
            <span className="inline-flex w-fit text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "rgba(108,99,255,0.1)", color: "#6C63FF" }}>{c.tag}</span>
            <span className="text-[11.5px] text-[#F5F7FA] font-medium">{c.convos}</span>
            <span className="text-[11px] text-[#8B95A7]">{c.last}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Broadcasts tab content
function BroadcastsDemo() {
  const broadcasts = [
    { name: "New Collection Launch", status: "Sent", sent: 843, opened: 512, page: "Bloom Fashion", date: "Aug 1" },
    { name: "Summer Sale Reminder", status: "Scheduled", sent: 0, opened: 0, page: "Urban Threads", date: "Aug 12" },
    { name: "Back in Stock Alert", status: "Draft", sent: 0, opened: 0, page: "Bloom Fashion", date: "—" },
  ];
  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-semibold text-[#F5F7FA]">Broadcasts</h3>
          <p className="text-[11.5px] text-[#8B95A7]">Send messages to eligible audience segments</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white" style={{ background: "#6C63FF" }}>
          + New broadcast
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {broadcasts.map((b, i) => (
          <div key={i} className="flex items-center justify-between p-4 rounded-xl" style={{ background: "rgba(16,21,31,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13px] font-semibold text-[#F5F7FA]">{b.name}</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: b.status === "Sent" ? "rgba(16,185,129,0.12)" : b.status === "Scheduled" ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.06)", color: b.status === "Sent" ? "#10B981" : b.status === "Scheduled" ? "#F59E0B" : "#8B95A7" }}>
                  {b.status}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[#8B95A7]">
                <span>{b.page}</span>
                <span>{b.date}</span>
              </div>
            </div>
            {b.status === "Sent" && (
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-[14px] font-semibold text-[#F5F7FA]">{b.sent}</div>
                  <div className="text-[9.5px] text-[#8B95A7]">Sent</div>
                </div>
                <div className="text-center">
                  <div className="text-[14px] font-semibold text-[#F5F7FA]">{b.opened}</div>
                  <div className="text-[9.5px] text-[#8B95A7]">Opened</div>
                </div>
              </div>
            )}
          </div>
        ))}
        <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
          <span className="text-yellow-400 text-[11px]">⚠</span>
          <span className="text-[10.5px] text-[#8B95A7]">Broadcasts are sent only to customers eligible under platform messaging policies. Eligibility is based on recent interaction windows.</span>
        </div>
      </div>
    </div>
  );
}

// Analytics tab content
function AnalyticsDemo() {
  const barData = [
    { day: "Mon", value: 45, height: 45 },
    { day: "Tue", value: 72, height: 72 },
    { day: "Wed", value: 58, height: 58 },
    { day: "Thu", value: 89, height: 89 },
    { day: "Fri", value: 63, height: 63 },
    { day: "Sat", value: 34, height: 34 },
    { day: "Sun", value: 27, height: 27 },
  ];
  const maxVal = Math.max(...barData.map(d => d.value));

  const metrics = [
    { label: "Conversations", value: "183", change: "+12%", up: true },
    { label: "Avg. Response", value: "4.2m", change: "-8%", up: false },
    { label: "Resolved", value: "94%", change: "+3%", up: true },
    { label: "Audience", value: "1,247", change: "+47", up: true },
  ];

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[14px] font-semibold text-[#F5F7FA]">Analytics</h3>
          <p className="text-[11.5px] text-[#8B95A7]">Last 7 days</p>
        </div>
        <button className="px-3 py-1.5 rounded-lg text-[11px] text-[#8B95A7]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          Last 7 days ▾
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {metrics.map((m, i) => (
          <div key={i} className="p-3 rounded-xl" style={{ background: "rgba(16,21,31,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-[10px] font-semibold text-[#8B95A7]/60 uppercase tracking-wider mb-1.5">{m.label}</div>
            <div className="text-[20px] font-semibold text-[#F5F7FA] leading-none mb-1">{m.value}</div>
            <div className={`flex items-center gap-1 text-[10.5px] font-medium ${m.up ? "text-green-400" : "text-red-400"}`}>
              {m.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {m.change}
            </div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="p-4 rounded-xl" style={{ background: "rgba(16,21,31,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="text-[11px] font-semibold text-[#8B95A7]/60 uppercase tracking-wider mb-4">Conversation volume</div>
        <div className="flex items-end gap-2 h-24">
          {barData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className="w-full rounded-t-md transition-all duration-500"
                style={{
                  height: `${(d.height / maxVal) * 80}px`,
                  background: i === 3
                    ? "#6C63FF"
                    : "rgba(108,99,255,0.25)",
                  minHeight: "4px",
                }}
              />
              <span className="text-[9px] text-[#8B95A7]">{d.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProductDemo() {
  const [activeTab, setActiveTab] = useState("inbox");

  return (
    <section id="demo" className="py-24 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(108,99,255,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-[#8B95A7]/50 mb-4">
            Interactive demo
          </p>
          <h2 className="text-[36px] md:text-[52px] font-semibold tracking-[-0.03em] leading-tight text-[#F5F7FA] max-w-2xl mx-auto">
            See Messaivo in action.
          </h2>
          <p className="text-[16px] text-[#8B95A7] mt-4 max-w-lg mx-auto leading-relaxed">
            Explore the key features of your workspace. Click through each tab to see how Messaivo works.
          </p>
        </div>

        {/* Demo frame */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "#0B0F16",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
          }}
        >
          {/* Chrome bar */}
          <div
            className="flex items-center gap-2 px-4 py-3 border-b"
            style={{ background: "#07090D", borderColor: "rgba(255,255,255,0.06)" }}
          >
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
            </div>
            <div className="flex-1 max-w-xs mx-4 px-3 py-1 rounded-md text-[11px] text-[#8B95A7]" style={{ background: "rgba(255,255,255,0.04)" }}>
              app.messaivo.com/{activeTab}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center border-b px-4" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-[12.5px] font-medium border-b-2 transition-all duration-150 ${
                  activeTab === tab.id
                    ? "text-[#F5F7FA] border-[#6C63FF]"
                    : "text-[#8B95A7] border-transparent hover:text-[#F5F7FA]"
                }`}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content area */}
          <div className="h-[480px] overflow-hidden">
            <div className="h-full transition-all duration-300">
              {activeTab === "inbox" && <InboxDemo />}
              {activeTab === "audience" && <AudienceDemo />}
              {activeTab === "broadcasts" && <BroadcastsDemo />}
              {activeTab === "analytics" && <AnalyticsDemo />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
