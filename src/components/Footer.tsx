"use client";

import Link from "next/link";

const footerLinks = {
  Product:   [
    { label: "Features",  href: "/features" },
    { label: "Pricing",   href: "/pricing"  },
    { label: "Integrations", href: "/features" },
  ],
  Company:   [
    { label: "About",   href: "/contact" },
    { label: "Contact", href: "/contact" },
  ],
  Resources: [
    { label: "Help Center",    href: "/contact" },
    { label: "Documentation",  href: "/contact" },
  ],
  Legal: [
    { label: "Privacy",       href: "/privacy"       },
    { label: "Terms",         href: "/terms"         },
    { label: "Data Deletion", href: "/data-deletion" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="inline-flex items-center mb-4">
              <span className="text-[18px] font-semibold tracking-[-0.03em]" style={{ color: "var(--text)" }}>
                messaivo
              </span>
              <span className="ml-[2px] w-[5px] h-[5px] rounded-full inline-block mb-0.5" style={{ background: "#6C63FF" }} />
            </Link>
            <p className="text-[13px] leading-relaxed max-w-[200px]" style={{ color: "var(--muted)" }}>
              Customer conversations, organized.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a
                href="#"
                aria-label="LinkedIn"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: "var(--input-bg)", border: "1px solid var(--border)", color: "var(--muted)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="X (Twitter)"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: "var(--input-bg)", border: "1px solid var(--border)", color: "var(--muted)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--muted)", opacity: 0.5 }}>
                {section}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px] transition-colors"
                      style={{ color: "var(--muted)" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 pt-8 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="text-[12.5px]" style={{ color: "var(--muted)", opacity: 0.5 }}>
            © {new Date().getFullYear()} Messaivo. All rights reserved.
          </p>
          <p className="text-[12.5px]" style={{ color: "var(--muted)", opacity: 0.4 }}>
            Not affiliated with or endorsed by Meta Platforms, Inc.
          </p>
        </div>
      </div>
    </footer>
  );
}
