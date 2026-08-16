import { prisma } from "@/lib/db";

const STATUS_CONFIG = {
  connected:      { color: "#10B981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.15)", label: "Connected" },
  not_configured: { color: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.15)", label: "Not Configured" },
  error:          { color: "#EF4444", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.15)",  label: "Error" },
};

async function getIntegrationStatuses() {
  let dbStatus: "connected" | "error" = "error";
  let dbError: string | undefined;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch (e) {
    dbError = e instanceof Error ? e.message.slice(0, 120) : "Unknown error";
  }

  return [
    {
      key: "database",
      name: "PostgreSQL / Neon",
      description: "Primary database for all platform data, user accounts, workspaces, and messaging.",
      status: dbStatus as "connected" | "not_configured" | "error",
      error: dbError,
      icon: "🗄️",
    },
    {
      key: "clerk",
      name: "Clerk Auth",
      description: "User authentication, session management, and JWT tokens.",
      status: (process.env.CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) ? "connected" : "not_configured" as "connected" | "not_configured" | "error",
      icon: "🔐",
    },
    {
      key: "stripe",
      name: "Stripe",
      description: "Payment processing, subscription billing, and invoice management.",
      status: process.env.STRIPE_SECRET_KEY ? "connected" : "not_configured" as "connected" | "not_configured" | "error",
      icon: "💳",
    },
    {
      key: "meta",
      name: "Meta / Facebook",
      description: "Facebook Pages, Messenger API, and Instagram messaging integration.",
      status: process.env.META_APP_ID ? "connected" : "not_configured" as "connected" | "not_configured" | "error",
      icon: "📘",
    },
  ];
}

export default async function AdminIntegrationsPage() {
  const integrations = await getIntegrationStatuses();

  return (
    <div className="p-6 max-w-[900px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Integrations</h1>
        <p className="text-[13px]" style={{ color: "#8B95A7" }}>Status of all external service integrations. Credentials are never shown.</p>
      </div>

      <div className="space-y-3">
        {integrations.map((integration) => {
          const sc = STATUS_CONFIG[integration.status];
          return (
            <div
              key={integration.key}
              className="p-5 rounded-xl flex items-start gap-4"
              style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="text-[28px] shrink-0">{integration.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-[14px] font-semibold" style={{ color: "#F5F7FA" }}>{integration.name}</div>
                  <span
                    className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold"
                    style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}
                  >
                    {sc.label}
                  </span>
                </div>
                <div className="text-[12.5px] mt-1" style={{ color: "#8B95A7" }}>{integration.description}</div>
                {integration.error && (
                  <div className="mt-2 text-[11.5px] font-mono" style={{ color: "#EF4444" }}>Error: {integration.error}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 p-4 rounded-xl text-[12px]" style={{ background: "rgba(108,99,255,0.06)", border: "1px solid rgba(108,99,255,0.15)", color: "#8B85FF" }}>
        Integration configuration is managed via environment variables. Contact your DevOps team to update credentials.
      </div>
    </div>
  );
}
