import {
  MessageSquare,
  Users,
  FileText,
  Radio,
  Layers,
  ArrowRight,
  Check,
  Search,
  Filter,
  Plus,
} from "lucide-react";

function FbIcon({ size = 16, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

// ── Feature 1: Inbox UI ──────────────────────────────────────────────────────

function InboxUI() {
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
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "rgba(108,99,255,0.12)", color: "#6C63FF" }}>0</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
              <Search size={10} className="text-[#8B95A7]" />
              <span className="text-[10px] text-[#8B95A7]">Search...</span>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-10 gap-2.5 px-4 text-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(108,99,255,0.1)" }}>
              <MessageSquare size={14} style={{ color: "#6C63FF" }} />
            </div>
            <p className="text-[10.5px] text-[#8B95A7] leading-relaxed">
              Connect a Facebook Page to start receiving messages.
            </p>
          </div>
        </div>
        {/* Chat preview */}
        <div className="w-40 border-l p-3 hidden sm:flex flex-col items-center justify-center gap-2" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(108,99,255,0.1)" }}>
            <FbIcon size={15} style={{ color: "#6C63FF" }} />
          </div>
          <p className="text-[9.5px] text-[#8B95A7] text-center leading-relaxed">
            Messages appear here when a customer writes.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Feature 2: Audience UI ───────────────────────────────────────────────────

function AudienceUI() {
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
        <div className="flex flex-col items-center justify-center py-10 gap-2.5 text-center">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(34,211,238,0.1)" }}>
            <Users size={14} style={{ color: "#22D3EE" }} />
          </div>
          <p className="text-[10.5px] text-[#8B95A7] leading-relaxed max-w-[180px]">
            Audience members appear as customers start conversations.
          </p>
        </div>
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
              <div className="w-5 h-5 rounded-full bg-[#6C63FF] flex items-center justify-center text-[8px] font-bold text-white">P</div>
              <span className="text-[10px] font-semibold text-[#F5F7FA]">Your Page</span>
            </div>
            <div className="p-2.5 rounded-xl rounded-tl-none text-[11px] text-white leading-relaxed" style={{ background: "#6C63FF" }}>
              Hi <strong>{"{{first_name}}"}</strong>, thanks for reaching out to <strong>{"{{page_name}}"}</strong>! How can we help you today?
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
              <FbIcon size={12} style={{ color: "#6C63FF" }} />
              <span className="text-[11px] text-[#8B95A7]">Select a connected page...</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8B95A7]/60 mb-1.5">Eligible audience</div>
            <div className="grid grid-cols-3 gap-2">
              {[["Total", "—"], ["Eligible", "—"], ["Excluded", "—"]].map(([k, v]) => (
                <div key={k} className="p-2.5 rounded-lg text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="text-[14px] font-semibold text-[#F5F7FA]/30">{v}</div>
                  <div className="text-[9.5px] text-[#8B95A7]">{k}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8B95A7]/60 mb-1.5">Message</div>
            <div className="p-2.5 rounded-lg text-[11px] text-[#8B95A7]" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              Hey {"{{first_name}}"}, we have something new you might love...
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
          {[["Members", "—"], ["Pages", "—"], ["Active", "—"]].map(([k, v]) => (
            <div key={k} className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[18px] font-semibold" style={{ color: "rgba(245,247,250,0.25)" }}>{v}</div>
              <div className="text-[10px] text-[#8B95A7]">{k}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center justify-center py-8 gap-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.07)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(236,72,153,0.1)" }}>
            <Layers size={14} style={{ color: "#EC4899" }} />
          </div>
          <div className="text-center">
            <p className="text-[11px] font-medium text-[#F5F7FA]">Invite your team</p>
            <p className="text-[10px] text-[#8B95A7] mt-0.5">Add agents and assign page access.</p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium text-white" style={{ background: "#EC4899" }}>
            <Plus size={10} />
            Invite member
          </button>
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
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(108,99,255,0.03) 0%, transparent 60%)" }}
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
              className={`grid md:grid-cols-2 gap-12 items-center ${feature.reverse ? "md:[direction:rtl]" : ""}`}
            >
              <div className={feature.reverse ? "[direction:ltr]" : ""}>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11.5px] font-semibold mb-4"
                  style={{ background: `${feature.accent}12`, color: feature.accent, border: `1px solid ${feature.accent}25` }}
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

              <div className={`relative ${feature.reverse ? "[direction:ltr]" : ""}`}>
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
