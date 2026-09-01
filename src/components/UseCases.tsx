import { ShoppingBag, Headphones, Calendar, Home, Utensils, GraduationCap } from "lucide-react";

const personas = [
  {
    icon: ShoppingBag,
    label: "E-commerce stores",
    description:
      "Answer product questions, share order updates, and follow up with customers — all through your Facebook Page Messenger.",
    color: "#6C63FF",
  },
  {
    icon: Headphones,
    label: "Customer support teams",
    description:
      "Route Messenger conversations to the right agent, use templates for common replies, and keep a full history of every interaction.",
    color: "#22D3EE",
  },
  {
    icon: Calendar,
    label: "Service businesses",
    description:
      "Send appointment reminders, handle booking questions, and follow up with clients directly through Messenger.",
    color: "#10B981",
  },
  {
    icon: Home,
    label: "Real estate agencies",
    description:
      "Manage inquiries from multiple Facebook Pages, organize leads, and respond to property questions in one workspace.",
    color: "#F59E0B",
  },
  {
    icon: Utensils,
    label: "Restaurants & hospitality",
    description:
      "Handle reservation queries, answer menu questions, and keep regulars informed — without leaving Messaivo.",
    color: "#EC4899",
  },
  {
    icon: GraduationCap,
    label: "Education & training",
    description:
      "Respond to course inquiries, send class reminders, and manage student communications from one organized inbox.",
    color: "#8B5CF6",
  },
];

export default function UseCases() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 100%, rgba(108,99,255,calc(0.04 * var(--glow-mult))) 0%, transparent 60%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p
            className="text-[13px] font-semibold uppercase tracking-widest mb-4"
            style={{ color: "var(--muted)", opacity: 0.5 }}
          >
            Who uses Messaivo
          </p>
          <h2
            className="text-[36px] md:text-[52px] font-semibold tracking-[-0.03em] leading-tight max-w-2xl mx-auto"
            style={{ color: "var(--text)" }}
          >
            Built for businesses that talk to customers.
          </h2>
          <p
            className="text-[16px] mt-4 max-w-lg mx-auto leading-relaxed"
            style={{ color: "var(--muted)" }}
          >
            If your business uses a Facebook Page to communicate with customers,
            Messaivo gives you the tools to do it properly — at any scale.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {personas.map((p) => (
            <div
              key={p.label}
              className="p-6 rounded-xl transition-all duration-200 cursor-default group"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{
                  background: `${p.color}12`,
                  border: `1px solid ${p.color}25`,
                }}
              >
                <p.icon size={17} style={{ color: p.color }} />
              </div>
              <h3
                className="text-[14.5px] font-semibold mb-2"
                style={{ color: "var(--text)" }}
              >
                {p.label}
              </h3>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--muted)" }}>
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
