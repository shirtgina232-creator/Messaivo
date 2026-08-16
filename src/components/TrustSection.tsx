import { Shield, Lock, Users, Eye, Key, Server } from "lucide-react";

const trustPoints = [
  {
    icon: Shield,
    title: "Secure authentication",
    description: "Workspace access is protected through secure authentication. You control who has access to your workspace.",
  },
  {
    icon: Users,
    title: "Permission-based access",
    description: "Assign roles and permissions to team members. Not everyone needs access to everything — and now they don't have to.",
  },
  {
    icon: Lock,
    title: "Controlled data access",
    description: "Your customer data stays within your workspace. Access is scoped to what each team member needs to do their job.",
  },
  {
    icon: Eye,
    title: "Responsible data handling",
    description: "We handle your customer data with care and use it only to power the features you've enabled — nothing more.",
  },
  {
    icon: Key,
    title: "Platform-authorized connections",
    description: "Facebook Page connections go through official Meta authorization flows. We never ask for credentials outside the platform.",
  },
  {
    icon: Server,
    title: "Business-grade workspace",
    description: "Each workspace is isolated. Your data isn't mixed with other businesses — your workspace belongs to you.",
  },
];

export default function TrustSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 30% 50%, rgba(16,185,129,calc(0.03 * var(--glow-mult))) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(108,99,255,calc(0.03 * var(--glow-mult))) 0%, transparent 60%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-[13px] font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--muted)", opacity: 0.5 }}>
            Security & Trust
          </p>
          <h2 className="text-[36px] md:text-[52px] font-semibold tracking-[-0.03em] leading-tight max-w-2xl mx-auto" style={{ color: "var(--text)" }}>
            Built with trust at the core.
          </h2>
          <p className="text-[16px] mt-4 max-w-xl mx-auto leading-relaxed" style={{ color: "var(--muted)" }}>
            We take your business and your customers&apos; privacy seriously. Messaivo is designed with security and access control as foundational principles.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {trustPoints.map((point, i) => (
            <div
              key={i}
              className="p-6 rounded-xl"
              style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.15)" }}
              >
                <point.icon size={17} style={{ color: "#10B981" }} />
              </div>
              <h3 className="text-[14.5px] font-semibold mb-2" style={{ color: "var(--text)" }}>
                {point.title}
              </h3>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--muted)" }}>
                {point.description}
              </p>
            </div>
          ))}
        </div>

        <div
          className="mt-10 p-6 rounded-xl flex items-start gap-4"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <Shield size={20} style={{ color: "#6C63FF", flexShrink: 0 }} className="mt-0.5" />
          <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--muted)" }}>
            <span className="font-medium" style={{ color: "var(--text)" }}>All plans include secure workspace access.</span>{" "}
            Messaivo does not claim third-party security certifications at this time. We are committed to operating responsibly and will disclose compliance milestones as they are achieved.
          </p>
        </div>
      </div>
    </section>
  );
}
