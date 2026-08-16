/**
 * Promote a user to ADMIN role by email address.
 *
 * Usage:
 *   node scripts/promote-admin.mjs <email>
 *
 * Requires DATABASE_URL to be set (loaded from .env.local or environment).
 * The target user must have already signed up at least once so their record
 * exists in the database.
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local if DATABASE_URL is not already in the environment
if (!process.env.DATABASE_URL) {
  try {
    const envPath = resolve(__dirname, "../.env.local");
    const lines = readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const [key, ...rest] = line.split("=");
      if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
    }
  } catch {
    // .env.local not found — rely on process.env
  }
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/promote-admin.mjs <email>");
  process.exit(1);
}

// Dynamic import after env is loaded
const { PrismaClient } = await import("@prisma/client");
const { PrismaPg } = await import("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

try {
  const user = await prisma.user.update({
    where: { email },
    data: { role: "ADMIN" },
    select: { id: true, email: true, role: true, name: true },
  });
  console.log(`✅ Promoted to ADMIN: ${user.email}${user.name ? ` (${user.name})` : ""}`);
} catch (e) {
  if (e?.code === "P2025") {
    console.error(`❌ No user found with email: ${email}`);
    console.error("   Make sure the user has signed up before running this script.");
  } else {
    console.error("❌ Error:", e?.message ?? e);
  }
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
