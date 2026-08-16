import {
  MessageSquare,
  Users,
  FileText,
  Radio,
  Layers,
  ArrowRight,
  Circle,
  Check,
  Search,
  Filter,
  Plus,
} from "lucide-react";

// ── Feature 1: Inbox UI ──────────────────────────────────────────────────────

function InboxUI() {
  const convos = [
    { name: "Sarah M.", avatar: "SM", color: "#6C63FF", msg: "Hi! I saw your post...", time: "2m", unread: 2, status: "active" },
    { name: "James O.", avatar: "JO", color: "#22D3EE", msg: "Can I get more details?", time: "14m", unread: 0, status: "waiting" },
    { name: "Priya S.", avatar: "PS", color: "#10B981", msg: "Arrived perfectly, thank you!", time: "1h", unread: 0, status: "resolved" },
    { name: "Carlos V.", avatar: "CV", color: "#F59E0B", msg: "Do you have this in size M?", time: "2h", unread: 1, status: "active" },
  ];
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "#0B0F16", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)", background: "#07090D" }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
        </div>
        <span className="text-[10px] text-[#8B95A7] ml-2">Messaivo — Inbox</span>
      </div>
      <div className="flex">
        {/* List */}
        <div className="flex-1 divide-y divide-white/[0.04]">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-[#F5F7FA]">Conversations</span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "rgba(108,99,255,0.12)", color: "#6C63FF" }}>4</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
              <Search size={10} className="text-[#8B95A7]" />
              <span className="text-[10px] text-[#8B95A7]">Search...</span>
            </div>
          </div>
          {convos.map((c, i) => (
            <div key={i} className={`flex items-start gap-2.5 px-4 py-3 cursor-pointer transition-colors ${i === 0 ? "bg-[rgba(108,99,255,0.06)]" : "hover:bg-[rgba(255,255,255,0.02)]"}`}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ background: c.color }}>{c.avatar}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#F5F7FA]">{c.name}</span>
                  <span className="text-[9px] text-[#8B95A7]">{c.time}</span>
                </div>
                <p className="text-[10px] text-[#8B95A7] truncate">{c.msg}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[9px] flex items-center gap-1" style={{ color: c.status === "active" ? "#10B981" : c.status === "waiting" ? "#F59E0B" : "#8B95A7" }}>
                    <Circle size={4} fill="currentColor" />{c.status}
                  </span>
                  {c.unread > 0 && (
                    <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ background: "#6C63FF" }}>{c.unread}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Chat preview */}
        <div className="w-40 border-l p-3 hidden sm:flex flex-col" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-[#6C63FF] flex items-center justify-center text-[8px] font-bold text-white">SM</div>
            <span className="text-[10px] font-semibold text-[#F5F7FA]">Sarah M.</span>
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <div className="self-start text-[9.5px] text-[#F5F7FA] px-2 py-1.5 rounded-xl rounded-tl-none max-w-full" style={{ background: "rgba(255,255,255,0.06)" }}>Hi! I saw your post about the new collection...</div>
            <div className="self-end text-[9.5px] text-white px-2 py-1.5 rounded-xl rounded-tr-none" style={{ background: "#6C63FF" }}>Hi Sarah! Let me help you.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Feature 2: Audience UI ───────────────────────────────────────────────────

function AudienceUI() {
  const customers = [
    { name: "Sarah Mitchell", page: "Bloom Fashion", tag: "VIP", activity: "Today", status: "active" },
    { name: "James Okafor", page: "Urban Threads", tag: "Lead", activity: "Yesterday", status: "new" },
    { name: "Priya Sharma", page: "Bloom Fashion", tag: "Customer", activity: "3 days", status: "active" },
    { name: "Carlos Vega", page: "Urban Threads", tag: "Customer", activity: "1 week", status: "inactive" },
  ];
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#0B0F16", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)", background: "#07090D" }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
        </div>
        <span className="text-[10px] text-[#8B95A7] ml-2">Messaivo — Audience</span>
      </div>
      <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-2 flex-1">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg flex-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Search size={10} className="text-[#8B95A7]" />
            <span className="text-[10px] text-[#8B95A7]">Search audience...</span>
          </div>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-[#8B95A7]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Filter size={10} />Filter
          </button>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-white" style={{ background: "#6C63FF" }}>
          <Plus size={10} />Add
        </div>
      </div>
      <div className="divide-y divide-white/[0.04]">
        <div className="grid grid-cols-4 px-4 py-2">
          {["Name", "Page", "Tag", "Activity"].map((h) => (
            <span key={h} className="text-[9.5px] font-semibold uppercase tracking-wider text-[#8B95A7]/50">{h}</span>
          ))}
        </div>
        {customers.map((c, i) => (
          <div key={i} className="grid grid-cols-4 items-center px-4 py-2.5 hover:bg-[rgba(255,255,255,0.02)] cursor-pointer transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#6C63FF]/40 flex items-center justify-center text-[8px] font-bold text-white">{c.name.split(" ").map(n => n[0]).join("")}</div>
              <span className="text-[10.5px] font-medium text-[#F5F7FA] truncate">{c.name.split(" ")[0]}</span>
            </div>
            <span className="text-[10px] text-[#8B95A7] truncate">{c.page}</span>
            <span className="inline-flex w-fit text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "rgba(108,99,255,0.1)", color: "#6C63FF" }}>{c.tag}</span>
            <span className="text-[10px] text-[#8B95A7]">{c.activity}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Feature 3: Template UI ───────────────────────────────────────────────────

function TemplateUI() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#0B0F16", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)", background: "#07090D" }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
        </div>
        <span className="text-[10px] text-[#8B95A7] ml-2">Messaivo — Templates</span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-white/[0.05]">
        {/* Editor */}
        <div className="p-4">
          <div className="mb-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8B95A7]/60 mb-1">Template name</div>
            <div className="text-[11.5px] font-semibold text-[#F5F7FA]">Welcome Message</div>
          </div>
          <div className="mb-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8B95A7]/60 mb-1.5">Message body</div>
            <div className="p-3 rounded-lg text-[11px] leading-relaxed text-[#F5F7FA]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              Hi{" "}
              <span className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: "rgba(108,99,255,0.2)", color: "#8B85FF" }}>
                {"{{first_name}}"}
              </span>
              , thanks for reaching out to{" "}
              <span className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: "rgba(34,211,238,0.15)", color: "#22D3EE" }}>
                {"{{page_name}}"}
              </span>
              ! How can we help you today?
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8B95A7]/60 mb-1.5">Variables</div>
            <div className="flex flex-wrap gap-1.5">
              {["{{first_name}}", "{{page_name}}", "{{date}}"].map((v) => (
                <span key={v} className="text-[9.5px] font-mono px-1.5 py-1 rounded" style={{ background: "rgba(108,99,255,0.1)", color: "#8B85FF" }}>{v}</span>
              ))}
            </div>
          </div>
        </div>
        {/* Preview */}
        <div className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8B95A7]/60 mb-3">Preview</div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-[#6C63FF] flex items-center justify-center text-[8px] font-bold text-white">M</div>
              <span className="text-[10px] font-semibold text-[#F5F7FA]">Bloom Fashion</span>
            </div>
            <div className="p-2.5 rounded-xl rounded-tl-none text-[11px] text-white leading-relaxed" style={{ background: "#6C63FF" }}>
              Hi <strong>Sarah</strong>, thanks for reaching out to <strong>Bloom Fashion</strong>! How can we help you today?
            </div>
            <div className="flex items-center gap-1 self-start">
              <Check size={9} style={{ color: "#10B981" }} />
              <span className="text-[9px] text-[#8B95A7]">Delivered</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Feature 4: Broadcast UI ──────────────────────────────────────────────────

function BroadcastUI() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#0B0F16", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)", background: "#07090D" }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
        </div>
        <span className="text-[10px] text-[#8B95A7] ml-2">Messaivo — Broadcasts</span>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[12.5px] font-semibold text-[#F5F7FA] mb-0.5">New Broadcast</div>
            <div className="text-[10.5px] text-[#8B95A7]">Reach eligible audience members</div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium" style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.2)" }}>
            <Radio size={10} />
            Draft
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8B95A7]/60 mb-1.5">Target page</div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-4 h-4 rounded-sm" style={{ background: "rgba(108,99,255,0.4)" }} />
              <span className="text-[11px] text-[#F5F7FA]">Bloom Fashion</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8B95A7]/60 mb-1.5">Eligible audience</div>
            <div className="grid grid-cols-3 gap-2">
              {[["Total", "1,247"], ["Eligible", "843"], ["Excluded", "404"]].map(([k, v]) => (
                <div key={k} className="p-2.5 rounded-lg text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="text-[14px] font-semibold text-[#F5F7FA]">{v}</div>
                  <div className="text-[9.5px] text-[#8B95A7]">{k}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8B95A7]/60 mb-1.5">Message</div>
            <div className="p-2.5 rounded-lg text-[11px] text-[#8B95A7]" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              Hey {"{{first_name}}"}, we have a new arrival you might love...
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
            <span className="text-yellow-400">⚠</span>
            <span className="text-[10px] text-[#8B95A7]">Only eligible customers (opted in within the last 24h) can receive broadcasts per platform policy.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Feature 5: Team UI ───────────────────────────────────────────────────────

function TeamUI() {
  const members = [
    { name: "Alex Rivera", role: "Admin", avatar: "AR", pages: 2, active: true },
    { name: "Maya Chen", role: "Agent", avatar: "MC", pages: 1, active: true },
    { name: "Sam Torres", role: "Agent", avatar: "ST", pages: 2, active: false },
  ];
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#0B0F16", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)", background: "#07090D" }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
        </div>
        <span className="text-[10px] text-[#8B95A7] ml-2">Messaivo — Workspace</span>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[["Members", "3"], ["Pages", "2"], ["Active", "2"]].map(([k, v]) => (
            <div key={k} className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[18px] font-semibold text-[#F5F7FA]">{v}</div>
              <div className="text-[10px] text-[#8B95A7]">{k}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {members.map((m, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white relative shrink-0" style={{ background: i === 0 ? "#6C63FF" : i === 1 ? "#22D3EE" : "#10B981" }}>
                {m.avatar}
                <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0B0F16] ${m.active ? "bg-green-400" : "bg-[#8B95A7]"}`} />
              </div>
              <div className="flex-1">
                <div className="text-[11.5px] font-semibold text-[#F5F7FA]">{m.name}</div>
                <div className="text-[10px] text-[#8B95A7]">{m.pages} pages · {m.role}</div>
              </div>
              <span className="text-[9.5px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: i === 0 ? "rgba(108,99,255,0.12)" : "rgba(255,255,255,0.06)", color: i === 0 ? "#6C63FF" : "#8B95A7" }}>{m.role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

const features = [
  {
    icon: MessageSquare,
    eyebrow: "Inbox",
    title: "One inbox. Every conversation.",
    description:
      "Manage customer conversations from all your connected Facebook Pages in one clean, organized workspace. No more switching between apps or losing context.",
    visual: <InboxUI />,
    accent: "#6C63FF",
    reverse: false,
  },
  {
    icon: Users,
    eyebrow: "Audience",
    title: "Know your audience.",
    description:
      "Organize customers by page, activity, tags, and status. Build a clear picture of who your audience is and maintain a full history of every interaction.",
    visual: <AudienceUI />,
    accent: "#22D3EE",
    reverse: true,
  },
  {
    icon: FileText,
    eyebrow: "Templates",
    title: "Respond faster.",
    description:
      "Create reusable message templates with dynamic variables. Reply to common questions in seconds, maintain a consistent voice, and never start from scratch.",
    visual: <TemplateUI />,
    accent: "#10B981",
    reverse: false,
  },
  {
    icon: Radio,
    eyebrow: "Broadcasts",
    title: "Reach the right audience.",
    description:
      "Create targeted broadcasts for eligible audience members instead of messaging customers one by one. Eligibility is determined by platform policies and opt-in windows.",
    visual: <BroadcastUI />,
    accent: "#F59E0B",
    reverse: true,
  },
  {
    icon: Layers,
    eyebrow: "Team",
    title: "Built for growing teams.",
    description:
      "Invite team members, assign roles, and manage access across multiple pages. Scale from solo operator to full customer support team without changing tools.",
    visual: <TeamUI />,
    accent: "#EC4899",
    reverse: false,
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(108,99,255,0.03) 0%, transparent 60%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-[#8B95A7]/50 mb-4">
            Features
          </p>
          <h2 className="text-[36px] md:text-[52px] font-semibold tracking-[-0.03em] leading-tight text-[#F5F7FA] max-w-2xl mx-auto">
            Everything in one place, built the way you work.
          </h2>
        </div>

        <div className="flex flex-col gap-28">
          {features.map((feature, i) => (
            <div
              key={i}
              className={`grid md:grid-cols-2 gap-12 items-center ${
                feature.reverse ? "md:[direction:rtl]" : ""
              }`}
            >
              <div className={feature.reverse ? "[direction:ltr]" : ""}>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11.5px] font-semibold mb-4"
                  style={{
                    background: `${feature.accent}12`,
                    color: feature.accent,
                    border: `1px solid ${feature.accent}25`,
                  }}
                >
                  <feature.icon size={12} />
                  {feature.eyebrow}
                </div>
                <h3 className="text-[28px] md:text-[36px] font-semibold tracking-[-0.025em] leading-tight text-[#F5F7FA] mb-4">
                  {feature.title}
                </h3>
                <p className="text-[15px] text-[#8B95A7] leading-relaxed mb-6">
                  {feature.description}
                </p>
                <a
                  href="/features"
                  className="inline-flex items-center gap-2 text-[13.5px] font-medium transition-colors hover:gap-3 group"
                  style={{ color: feature.accent }}
                >
                  Learn more
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </a>
              </div>

              <div
                className={`relative ${feature.reverse ? "[direction:ltr]" : ""}`}
              >
                <div
                  className="absolute -inset-6 rounded-3xl pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at 50% 50%, ${feature.accent}08 0%, transparent 70%)`,
                    filter: "blur(20px)",
                  }}
                />
                {feature.visual}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
