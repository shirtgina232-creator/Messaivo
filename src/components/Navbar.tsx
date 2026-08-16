"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { MessaivoLogo } from "./MessaivoLogo";

const navLinks = [
  { label: "Product",   href: "/features" },
  { label: "Features",  href: "/features" },
  { label: "Pricing",   href: "/pricing"  },
  { label: "Resources", href: "#faq"      },
];

export default function Navbar() {
  const [scrolled, setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "glass-nav" : "bg-transparent"
        }`}
        style={scrolled ? { borderBottom: "1px solid var(--border)" } : {}}
      >
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <MessaivoLogo theme="dark" height={30} />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-[13.5px] font-medium transition-colors duration-150"
                style={{ color: "var(--muted)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-[13.5px] font-medium px-4 py-2 transition-colors"
              style={{ color: "var(--muted)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-[13.5px] font-semibold text-white px-4 py-2 rounded-lg transition-all duration-150"
              style={{
                background: "#6C63FF",
                boxShadow: "0 0 20px rgba(108,99,255,0.25)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "#5B52E8";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "#6C63FF";
              }}
            >
              Get started
            </Link>
          </div>

          {/* Mobile row: toggle + hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: "var(--muted)" }}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 backdrop-blur-xl"
          style={{ background: "var(--glass)" }}
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={`absolute top-0 right-0 bottom-0 w-full max-w-xs flex flex-col pt-20 px-6 transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
          style={{
            background: "var(--bg-2, var(--bg))",
            borderLeft: "1px solid var(--border)",
          }}
        >
          <nav className="flex flex-col gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-[15px] font-medium py-3 transition-colors"
                style={{
                  color: "var(--muted)",
                  borderBottom: "1px solid var(--border)",
                }}
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-3 mt-8">
            <Link
              href="/login"
              className="text-[14px] font-medium text-center py-3 rounded-lg transition-all"
              style={{
                color: "var(--muted)",
                border: "1px solid var(--border-md)",
              }}
              onClick={() => setMobileOpen(false)}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-[14px] font-semibold text-center text-white py-3 rounded-lg transition-all"
              style={{ background: "#6C63FF" }}
              onClick={() => setMobileOpen(false)}
            >
              Get started
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
