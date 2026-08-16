import { prisma } from "@/lib/db";
import { requireAdminOrError } from "@/lib/admin-helpers";
import { ok, serverError } from "@/lib/api-helpers";

export async function GET() {
  const [, err] = await requireAdminOrError();
  if (err) return err;
  try {
    // Check DB connection
    let dbStatus: "connected" | "error" = "error";
    let dbError: string | undefined;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = "connected";
    } catch (e) {
      dbError = e instanceof Error ? e.message : "Unknown error";
    }

    // Check env vars (never expose values)
    const clerkConfigured = !!(process.env.CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
    const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;
    const metaConfigured = !!process.env.META_APP_ID;

    const integrations = [
      {
        key: "database",
        name: "PostgreSQL / Neon",
        description: "Primary database for all platform data.",
        status: dbStatus,
        error: dbError,
      },
      {
        key: "clerk",
        name: "Clerk Auth",
        description: "User authentication and session management.",
        status: clerkConfigured ? "connected" : "not_configured",
      },
      {
        key: "stripe",
        name: "Stripe",
        description: "Payment processing and subscription billing.",
        status: stripeConfigured ? "connected" : "not_configured",
      },
      {
        key: "meta",
        name: "Meta / Facebook",
        description: "Facebook Pages and Messenger integration.",
        status: metaConfigured ? "connected" : "not_configured",
      },
    ];

    return ok({ integrations });
  } catch (e) {
    console.error("[GET /api/admin/integrations]", e);
    return serverError();
  }
}
