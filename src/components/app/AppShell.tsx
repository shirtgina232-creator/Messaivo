"use client";

import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, MessageSquare, Radio, Link2, FileText,
  Layers, BarChart2, CreditCard, Settings, ChevronLeft, Menu, X,
  Search, Bell, HelpCircle, ChevronDown, MessageCircleMore, Mail,
  Phone, Check, LogOut, Zap, Globe, Plus,
} from "lucide-react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useWorkspace } from "@/lib/workspace-context";
import { MessaivoLogo } from "@/components/MessaivoLogo";
import AnnouncementBanner from "@/components/app/AnnouncementBanner";

// ── Shell Context ─────────────────────────────────────────────────────────────

type ShellCtx = { collapsed: boolean; setCollapsed: (v: boolean) => void; mobileOpen: boolean; setMobileOpen: (v: boolean) => void; };
const ShellContext = createContext<ShellCtx>({ collapsed: false, setCollapsed: () => {}, mobileOpen: false, setMobileOpen: () => {} });
export const useShell = () => useContext(ShellContext);

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV = [
  {
    section: "MAIN",
    items: [
      { label: "Dashboard",  icon: LayoutDashboard, href: "/app"             },
      { label: "Audience",   icon: Users,            href: "/app/audience"   },
      { label: "Inbox",      icon: MessageSquare,    href: "/app/inbox", badge: 3 },
      { label: "Broadcasts", icon: Radio,            href: "/app/broadcasts" },
    ],
  },
  {
    section: "MANAGE",
    items: [
      { label: "Pages",     icon: Link2,    href: "/app/pages"     },
      { label: "Templates", icon: FileText, href: "/app/templates" },
      { label: "Groups",    icon: Layers,   href: "/app/groups"    },
    ],
  },
  {
    section: "ANALYTICS",
    items: [
      { label: "Analytics", icon: BarChart2, href: "/app/analytics" },
      { label: "Credits",   icon: Zap,       href: "/app/credits"   },
    ],
  },
  {
    section: "SETTINGS",
    items: [
      { label: "Settings", icon: Settings,   href: "/app/settings" },
      { label: "Billing",  icon: CreditCard, href: "/app/billing"  },
    ],
  },
];

// ── Page Selector (uses real pages from workspace context) ────────────────────

function PageSelector() {
  const { selectedPageId, setSelectedPageId, pages } = useWorkspace();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = selectedPageId ? pages.find(p => p.id === selectedPageId) : null;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all"
        style={{
          background: open ? "rgba(108,99,255,0.12)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${open ? "rgba(108,99,255,0.3)" : "rgba(255,255,255,0.07)"}`,
          color: "#F5F7FA",
        }}
        onClick={() => setOpen(!open)}
      >
        {selected ? (
          <>
            <span className="w-4 h-4 rounded text-[8px] font-bold text-white flex items-center justify-center shrink-0" style={{ background: selected.color }}>{selected.avatar[0]}</span>
            <span className="hidden sm:block max-w-[120px] truncate">{selected.name}</span>
          </>
        ) : (
          <>
            <Globe size={13} style={{ color: "#8B95A7" }} />
            <span className="hidden sm:block">All Pages</span>
          </>
        )}
        <ChevronDown size={11} style={{ color: "#8B95A7" }} />
      </button>

      {open && (
        <div className="absolute top-10 left-0 w-56 rounded-xl shadow-2xl z-50 overflow-hidden py-1" style={{ background: "#0A111B", border: "1px solid rgba(255,255,255,0.1)" }}>
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-[rgba(255,255,255,0.04)]"
            onClick={() => { setSelectedPageId(null); setOpen(false); }}
          >
            <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}>
              <Globe size={11} style={{ color: "#8B95A7" }} />
            </div>
            <span className="text-[13px] font-medium flex-1" style={{ color: "#F5F7FA" }}>All Pages</span>
            {!selectedPageId && <Check size={12} style={{ color: "#6C63FF" }} />}
          </button>

          <div className="mx-3 my-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }} />

          {pages.length === 0 ? (
            <div className="px-3 py-2.5 text-[12px]" style={{ color: "#8B95A7" }}>No pages connected</div>
          ) : pages.map(page => (
            <button
              key={page.id}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-[rgba(255,255,255,0.04)]"
              onClick={() => { setSelectedPageId(page.id); setOpen(false); }}
            >
              <div className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-bold text-white shrink-0" style={{ background: page.color }}>{page.avatar[0]}</div>
              <span className="text-[13px] font-medium flex-1 truncate" style={{ color: "#F5F7FA" }}>{page.name}</span>
              {selectedPageId === page.id && <Check size={12} style={{ color: "#6C63FF" }} />}
            </button>
          ))}

          <div className="mx-3 my-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }} />
          <Link
            href="/app/pages"
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-[rgba(255,255,255,0.04)]"
            onClick={() => setOpen(false)}
          >
            <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: "rgba(108,99,255,0.12)" }}>
              <Plus size={11} style={{ color: "#6C63FF" }} />
            </div>
            <span className="text-[13px] font-medium" style={{ color: "#6C63FF" }}>Add another Page</span>
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Credit Chip ───────────────────────────────────────────────────────────────

function CreditChip() {
  const { monthlyAllocation, creditsRemaining, creditsUsed, unlimitedCredits } = useWorkspace();
  const pct = unlimitedCredits ? 0 : Math.round((creditsUsed / Math.max(1, monthlyAllocation)) * 100);
  const low = !unlimitedCredits && pct >= 80;

  return (
    <Link
      href="/app/credits"
      className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
      style={{
        background: low ? "rgba(239,68,68,0.08)" : "rgba(108,99,255,0.08)",
        border: `1px solid ${low ? "rgba(239,68,68,0.2)" : "rgba(108,99,255,0.2)"}`,
      }}
    >
      <Zap size={11} style={{ color: low ? "#EF4444" : "#6C63FF" }} />
      <span className="text-[12px] font-semibold" style={{ color: low ? "#EF4444" : "#8B85FF" }}>
        {unlimitedCredits ? "Unlimited" : `${creditsRemaining.toLocaleString()} credits`}
      </span>
      {!unlimitedCredits && (
        <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: low ? "#EF4444" : "#6C63FF" }} />
        </div>
      )}
    </Link>
  );
}

// ── Search command ─────────────────────────────────────────────────────────────

function SearchCommand({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setQuery(""); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-xl overflow-hidden shadow-2xl"
        style={{ background: "#0A111B", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <Search size={16} style={{ color: "#8B95A7" }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search customers, conversations, templates…"
            className="flex-1 bg-transparent text-[14px] outline-none"
            style={{ color: "#F5F7FA" }}
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(255,255,255,0.06)", color: "#8B95A7" }}>ESC</kbd>
        </div>
        <div className="py-6 text-center text-[12px]" style={{ color: "#8B95A7" }}>
          {query.length > 0
            ? `Searching for "${query}"…`
            : "Type to search across customers, conversations, templates…"}
        </div>
      </div>
    </div>
  );
}

// ── Notification menu ─────────────────────────────────────────────────────────

function NotificationMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="absolute top-12 right-0 w-80 rounded-xl shadow-2xl z-50 overflow-hidden" style={{ background: "#0A111B", border: "1px solid rgba(255,255,255,0.09)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <span className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>Notifications</span>
        <button onClick={onClose}><X size={15} style={{ color: "#8B95A7" }} /></button>
      </div>
      <div className="py-8 text-center text-[12.5px]" style={{ color: "#8B95A7" }}>
        No notifications yet.
      </div>
    </div>
  );
}

// ── Support modal ─────────────────────────────────────────────────────────────

function SupportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-2xl p-6" style={{ background: "#0A111B", border: "1px solid rgba(255,255,255,0.1)" }} onClick={e => e.stopPropagation()}>
        <button className="absolute top-4 right-4" onClick={onClose}><X size={16} style={{ color: "#8B95A7" }} /></button>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(108,99,255,0.12)" }}>
          <HelpCircle size={18} style={{ color: "#6C63FF" }} />
        </div>
        <h3 className="text-[16px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Contact Support</h3>
        <p className="text-[13px] mb-6" style={{ color: "#8B95A7" }}>Our team is here to help. Reach out through any channel below.</p>
        <div className="flex flex-col gap-2">
          {[
            { icon: MessageCircleMore, label: "WhatsApp", sub: "Chat with us on WhatsApp", color: "#25D366" },
            { icon: Mail,             label: "Email",     sub: "support@messaivo.com",    color: "#6C63FF" },
            { icon: Phone,            label: "Phone",     sub: "Available weekdays 9am–6pm", color: "#22D3EE" },
          ].map(({ icon: Icon, label, sub, color }) => (
            <button key={label} className="flex items-center gap-3 p-3 rounded-xl text-left" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
                <Icon size={15} style={{ color }} />
              </div>
              <div>
                <div className="text-[12.5px] font-semibold" style={{ color: "#F5F7FA" }}>{label}</div>
                <div className="text-[11px]" style={{ color: "#8B95A7" }}>{sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  "/app": "Dashboard", "/app/audience": "Audience", "/app/inbox": "Inbox",
  "/app/broadcasts": "Broadcasts", "/app/pages": "Pages",
  "/app/templates": "Templates", "/app/groups": "Groups",
  "/app/analytics": "Analytics", "/app/credits": "Credits",
  "/app/settings": "Settings", "/app/billing": "Billing",
};

function Topbar({ onSearchOpen, notifOpen, setNotifOpen }: {
  onSearchOpen: () => void;
  notifOpen: boolean;
  setNotifOpen: (v: boolean) => void;
}) {
  const { setMobileOpen } = useShell();
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "Messaivo";
  const [userOpen, setUserOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const { signOut } = useAuth();

  // Real user data from Clerk
  const { user } = useUser();
  const { userName } = useWorkspace();
  const firstName = user?.firstName ?? userName?.split(" ")[0] ?? "Me";
  const fullName = user?.fullName ?? userName ?? "Account";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const initials = (user?.firstName?.[0] ?? userName?.[0] ?? "U").toUpperCase();

  return (
    <>
      <div
        className="h-16 flex items-center justify-between px-4 border-b shrink-0 gap-3"
        style={{ background: "#07090D", borderColor: "rgba(255,255,255,0.07)" }}
      >
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg shrink-0"
            style={{ color: "#8B95A7" }}
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={18} />
          </button>
          <h1 className="text-[15px] font-semibold shrink-0" style={{ color: "#F5F7FA" }}>{title}</h1>
        </div>

        {/* Center: Page Selector */}
        <div className="flex-1 flex justify-center">
          <PageSelector />
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 shrink-0">
          <CreditChip />

          <button
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#8B95A7" }}
            onClick={onSearchOpen}
          >
            <Search size={13} />
            <span className="hidden lg:block">Search</span>
            <kbd className="hidden xl:block text-[10px] px-1 rounded font-mono" style={{ background: "rgba(255,255,255,0.06)" }}>⌘K</kbd>
          </button>

          <div className="relative">
            <button
              className="relative w-8 h-8 flex items-center justify-center rounded-lg"
              style={{ color: "#8B95A7", background: notifOpen ? "rgba(255,255,255,0.06)" : "transparent" }}
              onClick={() => setNotifOpen(!notifOpen)}
            >
              <Bell size={16} />
            </button>
            <NotificationMenu open={notifOpen} onClose={() => setNotifOpen(false)} />
          </div>

          <button className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ color: "#8B95A7" }} onClick={() => setSupportOpen(true)}>
            <HelpCircle size={16} />
          </button>

          <div className="w-px h-5" style={{ background: "rgba(255,255,255,0.08)" }} />

          <div className="relative">
            <button
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
              style={{ background: userOpen ? "rgba(255,255,255,0.06)" : "transparent" }}
              onClick={() => setUserOpen(!userOpen)}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: "#6C63FF" }}>{initials}</div>
              <span className="text-[13px] font-medium hidden sm:block" style={{ color: "#F5F7FA" }}>{firstName}</span>
              <ChevronDown size={12} style={{ color: "#8B95A7" }} />
            </button>
            {userOpen && (
              <div className="absolute top-12 right-0 w-52 rounded-xl shadow-xl z-50 overflow-hidden py-1" style={{ background: "#0A111B", border: "1px solid rgba(255,255,255,0.09)" }}>
                <div className="px-4 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <div className="text-[12.5px] font-semibold" style={{ color: "#F5F7FA" }}>{fullName}</div>
                  {email && <div className="text-[11px]" style={{ color: "#8B95A7" }}>{email}</div>}
                </div>
                <Link href="/app/settings" className="flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] hover:bg-[rgba(255,255,255,0.04)]" style={{ color: "#8B95A7" }} onClick={() => setUserOpen(false)}>
                  <Settings size={13} /> Settings
                </Link>
                <Link href="/app/billing" className="flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] hover:bg-[rgba(255,255,255,0.04)]" style={{ color: "#8B95A7" }} onClick={() => setUserOpen(false)}>
                  <CreditCard size={13} /> Billing
                </Link>
                <div className="border-t mt-1" style={{ borderColor: "rgba(255,255,255,0.07)" }} />
                <button
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] hover:bg-[rgba(255,255,255,0.04)]"
                  style={{ color: "#EF4444" }}
                  onClick={() => signOut({ redirectUrl: "/login" })}
                >
                  <LogOut size={13} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar() {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useShell();
  const [supportOpen, setSupportOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => href === "/app" ? pathname === "/app" : pathname.startsWith(href);

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`
          fixed md:relative top-0 left-0 h-full z-50 flex flex-col transition-all duration-300 shrink-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          ${collapsed ? "md:w-[64px]" : "md:w-[250px]"}
          w-[250px]
        `}
        style={{ background: "#0A111B", borderRight: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* Logo + collapse */}
        <div className="flex items-center justify-between px-4 h-16 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          {!collapsed && (
            <Link href="/app" className="flex items-center">
              <MessaivoLogo height={28} theme="light" />
            </Link>
          )}
          {collapsed && (
            <Link href="/app" className="flex items-center justify-center mx-auto">
              <MessaivoLogo variant="icon" height={28} />
            </Link>
          )}
          <div className="flex items-center gap-1">
            <button className="md:hidden w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: "#8B95A7" }} onClick={() => setMobileOpen(false)}>
              <X size={15} />
            </button>
            <button
              className="hidden md:flex w-7 h-7 items-center justify-center rounded-lg"
              style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronLeft size={14} style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>
          </div>
        </div>

        {/* Workspace name */}
        {!collapsed && (
          <div className="px-3 py-3 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
              <MessaivoLogo variant="favicon" height={22} className="shrink-0" />
              <span className="text-[12px] font-medium truncate flex-1" style={{ color: "#F5F7FA" }}>Messaivo</span>
              <ChevronDown size={11} style={{ color: "#8B95A7" }} />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV.map((section) => (
            <div key={section.section} className="mb-4">
              {!collapsed && (
                <div className="px-2 mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#8B95A7", opacity: 0.45 }}>{section.section}</span>
                </div>
              )}
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-2.5 px-2 py-2 rounded-lg mb-0.5 transition-all duration-150 ${active ? "bg-[rgba(108,99,255,0.12)]" : "hover:bg-[rgba(255,255,255,0.04)]"} ${collapsed ? "justify-center" : ""}`}
                    style={{ color: active ? "#8B85FF" : "#8B95A7" }}
                  >
                    <item.icon size={16} className="shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="text-[13px] font-medium flex-1">{item.label}</span>
                        {"badge" in item && item.badge ? (
                          <span className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: "#6C63FF" }}>{item.badge}</span>
                        ) : null}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Support */}
        {!collapsed && (
          <div className="p-3 border-t shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="px-2 pb-2">
              <span className="text-[10.5px] font-semibold" style={{ color: "#8B95A7", opacity: 0.55 }}>Need help?</span>
            </div>
            <div className="flex items-center gap-1.5 mb-2 px-1">
              {[
                { icon: MessageCircleMore, label: "WhatsApp", color: "#25D366" },
                { icon: Mail,             label: "Email",     color: "#6C63FF" },
                { icon: Phone,            label: "Phone",     color: "#22D3EE" },
              ].map(({ icon: Icon, label, color }) => (
                <button key={label} title={label} className="flex-1 flex items-center justify-center py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color }} onClick={() => setSupportOpen(true)}>
                  <Icon size={13} />
                </button>
              ))}
            </div>
            <button className="w-full text-center py-2 rounded-lg text-[12px] font-medium" style={{ background: "rgba(108,99,255,0.1)", color: "#8B85FF", border: "1px solid rgba(108,99,255,0.2)" }} onClick={() => setSupportOpen(true)}>
              Contact Support
            </button>
          </div>
        )}
        {collapsed && (
          <div className="p-2 border-t shrink-0 flex flex-col items-center gap-1" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <button title="Support" className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }} onClick={() => setSupportOpen(true)}>
              <HelpCircle size={16} />
            </button>
          </div>
        )}

        <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
      </aside>
    </>
  );
}

// ── AppShell ──────────────────────────────────────────────────────────────────

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    if (e.key === "Escape") { setSearchOpen(false); setNotifOpen(false); }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <ShellContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
      <div className="flex h-screen overflow-hidden" style={{ background: "#07090D" }}>
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar
            onSearchOpen={() => setSearchOpen(true)}
            notifOpen={notifOpen}
            setNotifOpen={setNotifOpen}
          />
          {/* Active announcements from DB */}
          <AnnouncementBanner />
          <main className="flex-1 overflow-y-auto" style={{ background: "#07090D" }}>
            {children}
          </main>
        </div>
      </div>
      <SearchCommand open={searchOpen} onClose={() => setSearchOpen(false)} />
    </ShellContext.Provider>
  );
}
