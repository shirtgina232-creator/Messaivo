"use client";

import { useState } from "react";
import {
  MessageSquare,
  Users,
  Radio,
  BarChart2,
  Search,
} from "lucide-react";

function FbIcon({ size = 16, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

const tabs = [
  { id: "inbox",      label: "Inbox",      icon: MessageSquare },
  { id: "audience",   label: "Audience",   icon: Users         },
  { id: "broadcasts", label: "Broadcasts", icon: Radio         },
  { id: "analytics",  label: "Analytics",  icon: BarChart2     },
];

// Inbox tab – empty state
function InboxDemo() {
  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 border-r flex flex-col" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold text-[#F5F7FA]">Conversations</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "rgba(108,99,255,0.12)", color: "#6C63FF" }}>0</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
            <Search size={10} className="text-[#8B95A7]" />
            <span className="text-[11px] text-[#8B95A7]">Search...</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(108,99,255,0.1)" }}>
            <MessageSquare size={16} style={{ color: "#6C63FF" }} />
          </div>
          <p className="text-[11px] text-[#8B95A7] leading-relaxed">
            Conversations from your connected Pages will appear here.
          </p>
        </div>
      </div>
      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(108,99,255,0.12)", border: "1px solid rgba(108,99,255,0.2)" }}>
          <FbIcon size={22} style={{ color: "#6C63FF" }} />
        </div>
        <div>
          <p className="text-[13.5px] font-semibold text-[#F5F7FA] mb-1">Connect a Facebook Page</p>
          <p className="text-[11.5px] text-[#8B95A7] max-w-xs leading-relaxed">
            Once connected, messages from your customers will appear here in real time.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium text-white" style={{ background: "#6C63FF" }}>
          <FbIcon size={13} />
          Connect with Facebook
        </div>
      </div>
    </div>
  );
}

// Audience tab – empty state
function AudienceDemo() {
  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-semibold text-[#F5F7FA]">Your Audience</h3>
          <p className="text-[11.5px] text-[#8B95A7]">Contacts from your connected Facebook Pages</p>
        </div>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="grid grid-cols-5 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#8B95A7]/50" style={{ background: "rgba(255,255,255,0.02)" }}>
          <span className="col-span-2">Name</span>
          <span>Page</span>
          <span>Convos</span>
          <span>Last active</span>
        </div>
        <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(34,211,238,0.1)" }}>
            <Users size={18} style={{ color: "#22D3EE" }} />
          </div>
          <div className="text-center">
            <p className="text-[12.5px] font-medium text-[#F5F7FA]">No contacts yet</p>
            <p className="text-[11px] text-[#8B95A7] mt-0.5">Audience members will appear after conversations start.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Broadcasts tab – empty state
function BroadcastsDemo() {
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
        <div className="flex flex-col items-center justify-center py-16 rounded-xl gap-3" style={{ background: "rgba(16,21,31,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(245,158,11,0.1)" }}>
            <Radio size={18} style={{ color: "#F59E0B" }} />
          </div>
          <div className="text-center">
            <p className="text-[12.5px] font-medium text-[#F5F7FA]">No broadcasts yet</p>
            <p className="text-[11px] text-[#8B95A7] mt-0.5">Create your first broadcast to reach eligible audience members.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
          <span className="text-yellow-400 text-[11px]">⚠</span>
          <span className="text-[10.5px] text-[#8B95A7]">Broadcasts are sent only to customers eligible under platform messaging policies. Eligibility is based on recent interaction windows.</span>
        </div>
      </div>
    </div>
  );
}

// Analytics tab – empty state
function AnalyticsDemo() {
  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[14px] font-semibold text-[#F5F7FA]">Analytics</h3>
          <p className="text-[11.5px] text-[#8B95A7]">Connect a Page to start tracking</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {["Conversations", "Avg. Response", "Resolved", "Audience"].map((label) => (
          <div key={label} className="p-3 rounded-xl" style={{ background: "rgba(16,21,31,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-[10px] font-semibold text-[#8B95A7]/60 uppercase tracking-wider mb-1.5">{label}</div>
            <div className="text-[20px] font-semibold leading-none mb-1" style={{ color: "rgba(245,247,250,0.2)" }}>—</div>
          </div>
        ))}
      </div>

      {/* Bar chart placeholder */}
      <div className="p-4 rounded-xl" style={{ background: "rgba(16,21,31,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="text-[11px] font-semibold text-[#8B95A7]/60 uppercase tracking-wider mb-4">Conversation volume</div>
        <div className="flex items-end gap-2 h-24">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full rounded-t-md" style={{ height: "4px", background: "rgba(108,99,255,0.12)" }} />
              <span className="text-[9px] text-[#8B95A7]">{day}</span>
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
        style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(108,99,255,0.05) 0%, transparent 70%)" }}
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
          <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ background: "#07090D", borderColor: "rgba(255,255,255,0.06)" }}>
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
              {activeTab === "inbox"      && <InboxDemo />}
              {activeTab === "audience"   && <AudienceDemo />}
              {activeTab === "broadcasts" && <BroadcastsDemo />}
              {activeTab === "analytics"  && <AnalyticsDemo />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
