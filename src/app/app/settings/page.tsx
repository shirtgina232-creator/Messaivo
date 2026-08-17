"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { User, Building, Bell, Shield, Users, Check, Eye, EyeOff, ArrowRight, CreditCard } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useWorkspace } from "@/lib/workspace-context";
import { derivedPageColor } from "@/lib/workspace-context";

const TABS = [
  { id: "profile",       icon: User,       label: "Profile"          },
  { id: "workspace",     icon: Building,   label: "Workspace"        },
  { id: "notifications", icon: Bell,       label: "Notifications"    },
  { id: "security",      icon: Shield,     label: "Security"         },
  { id: "team",          icon: Users,      label: "Team"             },
  { id: "billing",       icon: CreditCard, label: "Payment Methods"  },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className="w-9 h-5 rounded-full relative transition-colors"
      style={{ background: checked ? "#6C63FF" : "rgba(255,255,255,0.12)" }}
      onClick={() => onChange(!checked)}
    >
      <div className="absolute top-0.5 w-4 h-4 rounded-full transition-transform" style={{ background: "#fff", transform: checked ? "translateX(20px)" : "translateX(2px)" }} />
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

// ── Profile Tab ───────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user } = useUser();
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "";
  const email = user?.emailAddresses?.[0]?.emailAddress ?? "";
  const initials = fullName.split(" ").map(w => w[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";
  const avatarColor = derivedPageColor(fullName || email);

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        {user?.imageUrl ? (
          <img src={user.imageUrl} alt="avatar" className="w-14 h-14 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-[18px] font-bold text-white shrink-0" style={{ background: avatarColor }}>{initials}</div>
        )}
        <div>
          <div className="text-[13.5px] font-semibold" style={{ color: "#F5F7FA" }}>{fullName || "—"}</div>
          <div className="text-[12px]" style={{ color: "#8B95A7" }}>{email}</div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#8B95A7", opacity: 0.6 }}>Full Name</label>
          <input
            value={fullName}
            readOnly
            className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none opacity-70"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#8B95A7", opacity: 0.6 }}>Email Address</label>
          <input
            value={email}
            readOnly
            className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none opacity-70 cursor-not-allowed"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#8B95A7", opacity: 0.6 }}>Timezone</label>
          <select className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none cursor-pointer" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}>
            <option>UTC+05:00 Pakistan Standard Time</option>
            <option>UTC+00:00 GMT</option>
            <option>UTC-05:00 Eastern Time</option>
          </select>
        </div>
      </div>
      <div className="text-[12px]" style={{ color: "#8B95A7" }}>
        Profile name and email are managed via your Clerk account.
      </div>
    </div>
  );
}

// ── Workspace Tab ─────────────────────────────────────────────────────────────

function WorkspaceTab() {
  const [wsName, setWsName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/workspace")
      .then(r => r.ok ? r.json() : null)
      .then((d: { workspace?: { name?: string } } | null) => {
        if (d?.workspace?.name) setWsName(d.workspace.name);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!wsName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: wsName }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {} finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#8B95A7", opacity: 0.6 }}>Workspace Name</label>
        <input
          value={wsName}
          onChange={e => setWsName(e.target.value)}
          disabled={loading}
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
        style={{ background: saved ? "#10B981" : "#6C63FF", opacity: saving ? 0.7 : 1 }}
        onClick={handleSave}
        disabled={saving}
      >
        {saved ? <span className="flex items-center gap-1.5"><Check size={13} /> Saved!</span> : saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

// ── Notifications Tab ─────────────────────────────────────────────────────────

function NotificationsTab() {
  const [settings, setSettings] = useState({ newConversation: true, broadcastComplete: true, teamActivity: false, weeklyReport: true, emailDigest: false });
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

// ── Security Tab ──────────────────────────────────────────────────────────────

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
            <input type={show ? "text" : "password"} placeholder="••••••••" className="w-full px-3 py-2.5 pr-10 rounded-lg text-[13px] outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }} />
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={toggle}>
              {show ? <EyeOff size={14} style={{ color: "#8B95A7" }} /> : <Eye size={14} style={{ color: "#8B95A7" }} />}
            </button>
          </div>
        </div>
      ))}
      <button className="w-fit px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white" style={{ background: saved ? "#10B981" : "#6C63FF" }} onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}>
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

// ── Team Tab ──────────────────────────────────────────────────────────────────

function TeamTab() {
  const { user } = useUser();
  const { plan, teamMemberCount } = useWorkspace();
  const atLimit = teamMemberCount >= plan.teamMemberLimit;

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "You";
  const email = user?.emailAddresses?.[0]?.emailAddress ?? "";
  const initials = fullName.split(" ").map(w => w[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";
  const avatarColor = derivedPageColor(fullName || email);

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[13px]" style={{ color: "#8B95A7" }}>{teamMemberCount} / {plan.teamMemberLimit} members · {plan.name} plan</span>
        {atLimit ? (
          <Link href="/app/billing" className="flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 rounded-lg" style={{ background: "rgba(108,99,255,0.12)", color: "#6C63FF", border: "1px solid rgba(108,99,255,0.2)" }}>
            Upgrade to invite more <ArrowRight size={12} />
          </Link>
        ) : (
          <button className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg" style={{ background: "#6C63FF", color: "#fff" }}>Invite member</button>
        )}
      </div>
      <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3 px-4 py-4">
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: avatarColor }}>{initials}</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>{fullName}</div>
            <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>{email}</div>
          </div>
          <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(108,99,255,0.12)", color: "#6C63FF" }}>Admin</span>
        </div>
      </div>
      <div className="mt-3 text-[12px]" style={{ color: "#8B95A7" }}>
        Additional team members can be invited once multi-user support is configured.
      </div>
    </div>
  );
}

// ── Billing / Payment Methods Tab ─────────────────────────────────────────────

function BillingTab() {
  return (
    <div className="max-w-lg">
      <div className="py-14 flex flex-col items-center justify-center gap-3 text-center">
        <CreditCard size={32} style={{ color: "#8B95A7", opacity: 0.25 }} />
        <div className="text-[14px] font-semibold" style={{ color: "#F5F7FA" }}>No payment methods yet</div>
        <div className="text-[12.5px] max-w-xs" style={{ color: "#8B95A7" }}>
          Payment methods will appear here once Stripe billing is configured.
        </div>
        <Link href="/app/billing" className="mt-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white" style={{ background: "#6C63FF" }}>
          View Plans
        </Link>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");

  const renderTab = () => {
    switch (activeTab) {
      case "profile":       return <ProfileTab />;
      case "workspace":     return <WorkspaceTab />;
      case "notifications": return <NotificationsTab />;
      case "security":      return <SecurityTab />;
      case "team":          return <TeamTab />;
      case "billing":       return <BillingTab />;
      default:              return null;
    }
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Settings</h1>
      <p className="text-[13px] mb-7" style={{ color: "#8B95A7" }}>Manage your account, workspace, and preferences.</p>

      <div className="flex gap-6">
        {/* Sidebar */}
        <nav className="w-48 shrink-0 flex flex-col gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-left transition-all"
              style={{ background: activeTab === t.id ? "rgba(108,99,255,0.1)" : "transparent", color: activeTab === t.id ? "#8B85FF" : "#8B95A7" }}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {renderTab()}
        </div>
      </div>
    </div>
  );
}
