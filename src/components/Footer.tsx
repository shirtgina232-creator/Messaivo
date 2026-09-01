"use client";

import Link from "next/link";

const footerLinks = {
  Product: [
    { label: "Features",     href: "/features" },
    { label: "Pricing",      href: "/pricing"  },
    { label: "How it works", href: "/features" },
  ],
  Company: [
    { label: "Contact",      href: "/contact"  },
  ],
  Resources: [
    { label: "FAQ",           href: "/#faq"    },
    { label: "Contact us",   href: "/contact"  },
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
            <div className="mt-5">
              <a
                href="mailto:hello@messaivo.com"
                className="text-[12.5px] transition-colors"
                style={{ color: "var(--muted)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}
              >
                hello@messaivo.com
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
