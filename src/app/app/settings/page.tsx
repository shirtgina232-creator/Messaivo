"use client";

import { useState } from "react";
import Link from "next/link";
import { User, Building, Bell, Shield, Users, Check, Eye, EyeOff, ArrowRight, CreditCard, Plus, Trash2, Star } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";

const TABS = [
  { id: "profile",      icon: User,        label: "Profile"          },
  { id: "workspace",    icon: Building,    label: "Workspace"        },
  { id: "notifications",icon: Bell,        label: "Notifications"    },
  { id: "security",     icon: Shield,      label: "Security"         },
  { id: "team",         icon: Users,       label: "Team"             },
  { id: "billing",      icon: CreditCard,  label: "Payment Methods"  },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className="w-9 h-5 rounded-full relative transition-colors"
      style={{ background: checked ? "#6C63FF" : "rgba(255,255,255,0.12)" }}
      onClick={() => onChange(!checked)}
    >
      <div
        className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
        style={{ background: "#fff", transform: checked ? "translateX(20px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <div>
        <div className="text-[13px] font-medium" style={{ color: "#F5F7FA" }}>{label}</div>
        {description && <div className="text-[11.5px] mt-0.5" style={{ color: "#8B95A7" }}>{description}</div>}
      </div>
      {children}
    </div>
  );
}

function ProfileTab() {
  const [name, setName] = useState("Awais Tahiri");
  const [email] = useState("awaistahiri444@gmail.com");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-[18px] font-bold text-white shrink-0" style={{ background: "#6C63FF" }}>A</div>
        <div>
          <div className="text-[13.5px] font-semibold" style={{ color: "#F5F7FA" }}>{name}</div>
          <div className="text-[12px]" style={{ color: "#8B95A7" }}>{email}</div>
          <button className="text-[11.5px] mt-1" style={{ color: "#6C63FF" }}>Change avatar</button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#8B95A7", opacity: 0.6 }}>Full Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#8B95A7", opacity: 0.6 }}>Email Address</label>
          <input
            value={email}
            readOnly
            className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none opacity-60 cursor-not-allowed"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#8B95A7", opacity: 0.6 }}>Timezone</label>
          <select
            className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none cursor-pointer"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
          >
            <option>UTC+05:00 Pakistan Standard Time</option>
            <option>UTC+00:00 GMT</option>
            <option>UTC-05:00 Eastern Time</option>
          </select>
        </div>
      </div>

      <button
        className="flex items-center justify-center gap-2 w-fit px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
        style={{ background: saved ? "#10B981" : "#6C63FF" }}
        onClick={handleSave}
      >
        {saved ? <><Check size={14} /> Saved!</> : "Save Changes"}
      </button>
    </div>
  );
}

function WorkspaceTab() {
  const [wsName, setWsName] = useState("Messaivo");
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#8B95A7", opacity: 0.6 }}>Workspace Name</label>
        <input
          value={wsName}
          onChange={e => setWsName(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
        />
      </div>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#8B95A7", opacity: 0.6 }}>Default Language</label>
        <select className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none cursor-pointer" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}>
          <option>English</option>
          <option>Urdu</option>
          <option>Arabic</option>
        </select>
      </div>
      <button
        className="w-fit px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white"
        style={{ background: saved ? "#10B981" : "#6C63FF" }}
        onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
      >
        {saved ? <span className="flex items-center gap-1.5"><Check size={13} /> Saved!</span> : "Save Changes"}
      </button>
    </div>
  );
}

function NotificationsTab() {
  const [settings, setSettings] = useState({
    newConversation: true, broadcastComplete: true, teamActivity: false,
    weeklyReport: true, emailDigest: false,
  });

  const toggle = (key: keyof typeof settings) => setSettings(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="max-w-lg">
      <SettingRow label="New conversation" description="Get notified when a new message arrives"><Toggle checked={settings.newConversation} onChange={() => toggle("newConversation")} /></SettingRow>
      <SettingRow label="Broadcast complete" description="Notifications when a broadcast finishes sending"><Toggle checked={settings.broadcastComplete} onChange={() => toggle("broadcastComplete")} /></SettingRow>
      <SettingRow label="Team activity" description="Updates when team members take actions"><Toggle checked={settings.teamActivity} onChange={() => toggle("teamActivity")} /></SettingRow>
      <SettingRow label="Weekly report" description="Summary of your workspace each Monday"><Toggle checked={settings.weeklyReport} onChange={() => toggle("weeklyReport")} /></SettingRow>
      <SettingRow label="Email digest" description="Daily email with new conversations"><Toggle checked={settings.emailDigest} onChange={() => toggle("emailDigest")} /></SettingRow>
    </div>
  );
}

function SecurityTab() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <h3 className="text-[13.5px] font-semibold" style={{ color: "#F5F7FA" }}>Change Password</h3>
      {[
        { label: "Current Password", show: showCurrent, toggle: () => setShowCurrent(!showCurrent) },
        { label: "New Password",     show: showNew,     toggle: () => setShowNew(!showNew)         },
      ].map(({ label, show, toggle }) => (
        <div key={label}>
          <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#8B95A7", opacity: 0.6 }}>{label}</label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 pr-10 rounded-lg text-[13px] outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={toggle}>
              {show ? <EyeOff size={14} style={{ color: "#8B95A7" }} /> : <Eye size={14} style={{ color: "#8B95A7" }} />}
            </button>
          </div>
        </div>
      ))}
      <button
        className="w-fit px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white"
        style={{ background: saved ? "#10B981" : "#6C63FF" }}
        onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
      >
        {saved ? <span className="flex items-center gap-1.5"><Check size={13} /> Updated!</span> : "Update Password"}
      </button>

      <div className="mt-2 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <h3 className="text-[13.5px] font-semibold mb-4" style={{ color: "#F5F7FA" }}>Two-Factor Authentication</h3>
        <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <div className="text-[13px] font-medium mb-0.5" style={{ color: "#F5F7FA" }}>Authenticator App</div>
            <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>Not configured</div>
          </div>
          <button className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg" style={{ background: "rgba(108,99,255,0.1)", color: "#8B85FF", border: "1px solid rgba(108,99,255,0.2)" }}>Set up</button>
        </div>
      </div>
    </div>
  );
}

function TeamTab() {
  const { plan, teamMemberCount } = useWorkspace();
  const atLimit = teamMemberCount >= plan.teamMemberLimit;
  const team = [
    { name: "Awais Tahiri", email: "awaistahiri444@gmail.com", role: "Admin", color: "#6C63FF", active: true },
    { name: "Sarah Ahmed",  email: "sarah@messaivo.com",        role: "Agent", color: "#22D3EE", active: true },
    { name: "Usman Khan",   email: "usman@messaivo.com",        role: "Agent", color: "#10B981", active: false },
  ];

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[13px]" style={{ color: "#8B95A7" }}>
          {teamMemberCount} / {plan.teamMemberLimit} members · {plan.name} plan
        </span>
        {atLimit ? (
          <Link href="/app/billing" className="flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 rounded-lg" style={{ background: "rgba(108,99,255,0.12)", color: "#6C63FF", border: "1px solid rgba(108,99,255,0.2)" }}>
            Upgrade to invite more <ArrowRight size={12} />
          </Link>
        ) : (
          <button className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg" style={{ background: "#6C63FF", color: "#fff" }}>Invite member</button>
        )}
      </div>
      {atLimit && (
        <div className="mb-4 p-3 rounded-xl text-[12.5px]" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", color: "#8B95A7" }}>
          <span style={{ color: "#F5F7FA", fontWeight: 600 }}>Team member limit reached.</span> Upgrade your plan to add more team members.
        </div>
      )}
      <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        {team.map((m, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: m.color }}>
              {m.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>{m.name}</div>
              <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>{m.email}</div>
            </div>
            <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full" style={{ background: m.role === "Admin" ? "rgba(108,99,255,0.12)" : "rgba(255,255,255,0.06)", color: m.role === "Admin" ? "#6C63FF" : "#8B95A7" }}>{m.role}</span>
            {i !== 0 && <button className="text-[11.5px]" style={{ color: "#EF4444" }}>Remove</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Payment Methods Tab ───────────────────────────────────────────────────────

type SavedCard = {
  id: string;
  type: "visa" | "mastercard" | "paypal" | "applepay";
  label: string;
  expiry?: string;
  isDefault: boolean;
};

function BillingTab() {
  const [cards, setCards] = useState<SavedCard[]>([
    { id: "c1", type: "visa",       label: "Visa •••• 4242",      expiry: "08/28", isDefault: true  },
    { id: "c2", type: "mastercard", label: "Mastercard •••• 9813", expiry: "03/27", isDefault: false },
    { id: "c3", type: "paypal",     label: "PayPal — awaistahiri444@gmail.com",    isDefault: false },
  ]);
  const [adding, setAdding] = useState(false);

  const setDefault = (id: string) => setCards(prev => prev.map(c => ({ ...c, isDefault: c.id === id })));
  const remove = (id: string) => setCards(prev => prev.filter(c => c.id !== id));

  const cardBg = (type: SavedCard["type"]) => {
    if (type === "visa") return "#1A1F71";
    if (type === "mastercard") return "#252525";
    if (type === "paypal") return "#003087";
    return "#000";
  };

  const cardLabel = (type: SavedCard["type"]) => {
    if (type === "visa") return <span style={{ fontSize: 8, color: "#fff", fontWeight: 900, letterSpacing: 1 }}>VISA</span>;
    if (type === "mastercard") return (
      <div className="flex">
        <div className="w-3 h-3 rounded-full" style={{ background: "#EB001B" }} />
        <div className="w-3 h-3 rounded-full -ml-1.5" style={{ background: "#F79E1B" }} />
      </div>
    );
    if (type === "paypal") return <span style={{ fontSize: 7, color: "#fff", fontWeight: 800 }}>PP</span>;
    return <span style={{ fontSize: 9 }}>⌘</span>;
  };

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[14px] font-semibold" style={{ color: "#F5F7FA" }}>Payment Methods</h3>
          <p className="text-[12px] mt-0.5" style={{ color: "#8B95A7" }}>Saved payment methods for subscriptions and credit purchases.</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-medium text-white"
          style={{ background: "#6366F1" }}
        >
          <Plus size={13} /> Add method
        </button>
      </div>

      {/* Saved cards */}
      <div className="flex flex-col gap-3 mb-6">
        {cards.map(card => (
          <div
            key={card.id}
            className="flex items-center gap-4 p-4 rounded-xl"
            style={{ background: "#0A111B", border: `1px solid ${card.isDefault ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.08)"}` }}
          >
            {/* Card icon */}
            <div className="w-10 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: cardBg(card.type) }}>
              {cardLabel(card.type)}
            </div>

            {/* Card info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium" style={{ color: "#F5F7FA" }}>{card.label}</span>
                {card.isDefault && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.15)", color: "#6366F1" }}>Default</span>
                )}
              </div>
              {card.expiry && <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>Expires {card.expiry}</div>}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {!card.isDefault && (
                <button
                  onClick={() => setDefault(card.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                  style={{ color: "#8B95A7", border: "1px solid rgba(255,255,255,0.07)" }}
                  title="Set as default"
                >
                  <Star size={11} /> Default
                </button>
              )}
              <button
                onClick={() => remove(card.id)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "#8B95A7" }}
                title="Remove"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add card form (inline demo) */}
      {adding && (
        <div className="p-5 rounded-xl mb-4" style={{ background: "#0A111B", border: "1px solid rgba(99,102,241,0.25)" }}>
          <h4 className="text-[13px] font-semibold mb-4" style={{ color: "#F5F7FA" }}>Add Payment Method</h4>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[11px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>Card number</label>
              <input type="text" placeholder="1234  5678  9012  3456" className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#F5F7FA" }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>Expiry</label>
                <input type="text" placeholder="MM / YY" className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#F5F7FA" }} />
              </div>
              <div>
                <label className="text-[11px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>CVC</label>
                <input type="text" placeholder="123" className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#F5F7FA" }} />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>Cardholder name</label>
              <input type="text" placeholder="Full name on card" className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#F5F7FA" }} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white"
                style={{ background: "#6366F1" }}
                onClick={() => {
                  setCards(prev => [...prev, { id: `c${Date.now()}`, type: "visa", label: "Visa •••• ****", expiry: "12/29", isDefault: false }]);
                  setAdding(false);
                }}
              >
                Save Card
              </button>
              <button
                className="px-4 py-2.5 rounded-xl text-[13px] font-medium"
                style={{ color: "#8B95A7", border: "1px solid rgba(255,255,255,0.08)" }}
                onClick={() => setAdding(false)}
              >
                Cancel
              </button>
            </div>
          </div>
          <p className="text-[11px] mt-3" style={{ color: "#8B95A7", opacity: 0.6 }}>Demo only — no data is stored or transmitted.</p>
        </div>
      )}

      {/* Link to billing */}
      <div className="p-4 rounded-xl flex items-center justify-between" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
        <div>
          <div className="text-[13px] font-medium" style={{ color: "#F5F7FA" }}>Billing & Subscription</div>
          <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>Manage your plan and view billing history</div>
        </div>
        <Link href="/app/billing" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium" style={{ color: "#6366F1", border: "1px solid rgba(99,102,241,0.25)" }}>
          Go to Billing <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = useState("profile");

  const CONTENT: Record<string, React.ReactNode> = {
    profile: <ProfileTab />,
    workspace: <WorkspaceTab />,
    notifications: <NotificationsTab />,
    security: <SecurityTab />,
    team: <TeamTab />,
    billing: <BillingTab />,
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Settings</h1>
        <p className="text-[13px]" style={{ color: "#8B95A7" }}>Manage your account and workspace preferences.</p>
      </div>

      <div className="flex gap-6">
        {/* Tab nav */}
        <div className="w-48 shrink-0 flex flex-col gap-0.5">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors"
              style={{
                background: tab === t.id ? "rgba(108,99,255,0.12)" : "transparent",
                color: tab === t.id ? "#8B85FF" : "#8B95A7",
              }}
            >
              <t.icon size={14} className="shrink-0" />
              <span className="text-[13px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-5 rounded-xl" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
          {CONTENT[tab]}
        </div>
      </div>
    </div>
  );
}
