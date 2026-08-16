import { MessageSquare, Users, Radio, FileText, BarChart2, Shield, Link2, Layers } from "lucide-react";

const capabilities = [
  { icon: MessageSquare, label: "Unified Inbox",        description: "All conversations in one place"       },
  { icon: Users,         label: "Audience Management",  description: "Organize and segment customers"        },
  { icon: Radio,         label: "Permitted Broadcasts", description: "Reach eligible audiences at scale"     },
  { icon: FileText,      label: "Message Templates",    description: "Reusable replies and outreach"         },
  { icon: BarChart2,     label: "Analytics",            description: "Track conversation performance"        },
  { icon: Link2,         label: "Page Connections",     description: "Multiple Facebook Pages supported"     },
  { icon: Layers,        label: "Team Workspace",       description: "Roles, permissions, collaboration"     },
  { icon: Shield,        label: "Secure Access",        description: "Controlled authentication"             },
];

export default function SocialProof() {
  return (
    <section className="py-20 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-[13px] font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--muted)", opacity: 0.6 }}>
            Built to handle it all
          </p>
          <h2 className="text-[28px] md:text-[36px] font-semibold tracking-[-0.02em] max-w-xl mx-auto leading-tight" style={{ color: "var(--text)" }}>
            Everything your team needs to manage customer conversations.
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {capabilities.map((cap) => (
            <div
              key={cap.label}
              className="flex flex-col gap-3 p-4 rounded-xl transition-all duration-200 cursor-default"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(108,99,255,0.10)", border: "1px solid rgba(108,99,255,0.16)" }}
              >
                <cap.icon size={15} style={{ color: "#6C63FF" }} />
              </div>
              <div>
                <div className="text-[13px] font-semibold mb-0.5" style={{ color: "var(--text)" }}>{cap.label}</div>
                <div className="text-[12px] leading-snug" style={{ color: "var(--muted)" }}>{cap.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
