"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  LayoutDashboard, Users, Building2, Zap, Link2, Radio,
  MessageSquare, CreditCard, Palette, Settings, ScrollText,
  Shield, ChevronLeft, Menu, X, LogOut, ChevronDown,
  DollarSign, Tag, FileText, Image, Type, Bell, Globe, ShieldCheck,
} from "lucide-react";
import { MessaivoLogo } from "@/components/MessaivoLogo";

const NAV = [
  {
    section: "OVERVIEW",
    items: [{ label: "Dashboard", icon: LayoutDashboard, href: "/admin" }],
  },
  {
    section: "USERS & BILLING",
    items: [
      { label: "Users",       icon: Users,        href: "/admin/users"      },
      { label: "Workspaces",  icon: Building2,    href: "/admin/workspaces" },
      { label: "Credits",     icon: Zap,          href: "/admin/credits"    },
      { label: "Plans",       icon: CreditCard,   href: "/admin/plans"      },
      { label: "Payments",    icon: DollarSign,   href: "/admin/payments"   },
      { label: "Offers",      icon: Tag,          href: "/admin/offers"     },
    ],
  },
  {
    section: "PRODUCT",
    items: [
      { label: "Pages",         icon: Link2,         href: "/admin/pages"         },
      { label: "Broadcasts",    icon: Radio,         href: "/admin/broadcasts"    },
      { label: "Conversations", icon: MessageSquare, href: "/admin/conversations" },
      { label: "Templates",     icon: FileText,      href: "/admin/templates"     },
    ],
  },
  {
    section: "CUSTOMER APP",
    items: [
      { label: "Theme",         icon: Palette,  href: "/admin/theme"         },
      { label: "Branding",      icon: Image,    href: "/admin/branding"      },
      { label: "Content",       icon: Type,     href: "/admin/content"       },
      { label: "Announcements", icon: Bell,     href: "/admin/announcements" },
    ],
  },
  {
    section: "SYSTEM",
    items: [
      { label: "Settings",     icon: Settings,     href: "/admin/settings"     },
      { label: "Integrations", icon: Globe,        href: "/admin/integrations" },
      { label: "Admin Roles",  icon: ShieldCheck,  href: "/admin/roles"        },
      { label: "Audit Logs",   icon: ScrollText,   href: "/admin/audit-logs"   },
    ],
  },
];

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "#EF4444",
  ADMIN: "#F97316",
  SUPPORT: "#3B82F6",
  FINANCE: "#10B981",
};

function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  adminRole,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  adminRole: string;
}) {
  const pathname = usePathname();
  const { signOut } = useAuth();

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const roleColor = ROLE_COLORS[adminRole] ?? "#EF4444";

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed md:relative top-0 left-0 h-full z-50 flex flex-col transition-all duration-300 shrink-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          ${collapsed ? "md:w-[64px]" : "md:w-[240px]"} w-[240px]`}
        style={{ background: "#0A111B", borderRight: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* Logo + collapse */}
        <div
          className="flex items-center justify-between px-4 h-16 border-b shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-2">
              <MessaivoLogo height={26} theme="light" showTagline={false} />
            </Link>
          )}
          {collapsed && (
            <Link href="/admin" className="flex items-center justify-center mx-auto">
              <MessaivoLogo variant="icon" height={26} />
            </Link>
          )}
          <div className="flex items-center gap-1">
            <button
              className="md:hidden w-7 h-7 flex items-center justify-center rounded-lg"
              style={{ color: "#8B95A7" }}
              onClick={() => setMobileOpen(false)}
            >
              <X size={15} />
            </button>
            <button
              className="hidden md:flex w-7 h-7 items-center justify-center rounded-lg"
              style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}
              onClick={() => setCollapsed(!collapsed)}
            >
              <ChevronLeft
                size={14}
                style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
              />
            </button>
          </div>
        </div>

        {/* Admin badge */}
        {!collapsed && (
          <div className="px-3 py-2.5 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
              style={{ background: `${roleColor}14`, border: `1px solid ${roleColor}25` }}
            >
              <Shield size={12} style={{ color: roleColor }} />
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: roleColor }}>
                {adminRole.replace("_", " ")}
              </span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <Shield size={14} style={{ color: roleColor }} />
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV.map((section) => (
            <div key={section.section} className="mb-4">
              {!collapsed && (
                <div className="px-2 mb-1.5">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: "#8B95A7", opacity: 0.45 }}
                  >
                    {section.section}
                  </span>
                </div>
              )}
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-2.5 px-2 py-2 rounded-lg mb-0.5 transition-all duration-150
                      ${active ? "bg-[rgba(239,68,68,0.1)]" : "hover:bg-[rgba(255,255,255,0.04)]"}
                      ${collapsed ? "justify-center" : ""}`}
                    style={{ color: active ? "#EF4444" : "#8B95A7" }}
                    onClick={() => setMobileOpen(false)}
                  >
                    <item.icon size={16} className="shrink-0" />
                    {!collapsed && (
                      <span className="text-[13px] font-medium flex-1">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom: go to app + sign out */}
        <div className="p-3 border-t shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          {!collapsed && (
            <Link
              href="/app"
              className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2 text-[12.5px] font-medium hover:bg-[rgba(255,255,255,0.04)] transition-colors"
              style={{ color: "#8B95A7" }}
            >
              <LayoutDashboard size={14} />
              Go to Customer App
            </Link>
          )}
          <button
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[12.5px] font-medium hover:bg-[rgba(255,255,255,0.04)] transition-colors ${collapsed ? "justify-center" : ""}`}
            style={{ color: "#EF4444" }}
            onClick={() => signOut({ redirectUrl: "/login" })}
            title={collapsed ? "Sign out" : undefined}
          >
            <LogOut size={14} />
            {!collapsed && "Sign out"}
          </button>
        </div>
      </aside>
    </>
  );
}

function Topbar({
  adminName,
  adminRole,
  onMenuOpen,
}: {
  adminName: string;
  adminRole: string;
  onMenuOpen: () => void;
}) {
  const pathname = usePathname();
  const [userOpen, setUserOpen] = useState(false);
  const { signOut } = useAuth();

  const roleColor = ROLE_COLORS[adminRole] ?? "#EF4444";

  const label =
    pathname === "/admin"
      ? "Dashboard"
      : pathname.split("/").pop()?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Admin";

  return (
    <div
      className="h-16 flex items-center justify-between px-4 border-b shrink-0 gap-3"
      style={{ background: "#07090D", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg shrink-0"
          style={{ color: "#8B95A7" }}
          onClick={onMenuOpen}
        >
          <Menu size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Shield size={14} style={{ color: "#EF4444" }} />
          <h1 className="text-[15px] font-semibold shrink-0" style={{ color: "#F5F7FA" }}>
            {label}
          </h1>
        </div>
      </div>

      <div className="relative">
        <button
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
          style={{ background: userOpen ? "rgba(255,255,255,0.06)" : "transparent" }}
          onClick={() => setUserOpen(!userOpen)}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
            style={{ background: roleColor }}
          >
            {adminName[0]?.toUpperCase() ?? "A"}
          </div>
          <span className="text-[13px] font-medium hidden sm:block" style={{ color: "#F5F7FA" }}>
            {adminName}
          </span>
          <ChevronDown size={12} style={{ color: "#8B95A7" }} />
        </button>
        {userOpen && (
          <div
            className="absolute top-12 right-0 w-52 rounded-xl shadow-xl z-50 overflow-hidden py-1"
            style={{ background: "#0A111B", border: "1px solid rgba(255,255,255,0.09)" }}
          >
            <div className="px-4 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: roleColor }}>
                {adminRole.replace("_", " ")}
              </div>
              <div className="text-[12px] font-medium truncate" style={{ color: "#F5F7FA" }}>{adminName}</div>
            </div>
            <Link
              href="/app"
              className="flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] hover:bg-[rgba(255,255,255,0.04)]"
              style={{ color: "#8B95A7" }}
              onClick={() => setUserOpen(false)}
            >
              <LayoutDashboard size={13} /> Customer App
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
  );
}

export default function AdminShell({
  children,
  adminName,
  adminRole,
}: {
  children: React.ReactNode;
  adminName: string;
  adminRole: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setMobileOpen(false);
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#07090D" }}>
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        adminRole={adminRole}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar adminName={adminName} adminRole={adminRole} onMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto" style={{ background: "#07090D" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
