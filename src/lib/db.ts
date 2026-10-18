import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function normalizeConnectionString(url: string): string {
  // pg warns when sslmode is 'prefer', 'require', or 'verify-ca' because they are
  // treated as aliases for 'verify-full'. Replace with the explicit intended value.
  return url.replace(/([?&]sslmode=)(prefer|require|verify-ca)(\b|$)/g, "$1verify-full$3");
}

function createClient(): PrismaClient {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    // Fail immediately rather than letting pg silently fall back to localhost:5432.
    // If you see this error, set DATABASE_URL in your environment / Vercel dashboard.
    throw new Error("DATABASE_URL is not set — cannot connect to the database");
  }
  const connectionString = normalizeConnectionString(raw);
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
