/**
 * Seed script: creates a SUPER_ADMIN user.
 *
 * Usage:
 *   node scripts/seed-admin.mjs
 *
 * Defaults: admin@gmail.com / Admin@123
 * Override: SEED_EMAIL=you@example.com SEED_PASSWORD=MyPass123 node scripts/seed-admin.mjs
 */

import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local so DATABASE_URL is available when running locally
try {
  const dotenv = require("dotenv");
  dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
} catch {
  // dotenv not installed — rely on the environment already having DATABASE_URL
}

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");

const EMAIL    = process.env.SEED_EMAIL    ?? "admin@gmail.com";
const PASSWORD = process.env.SEED_PASSWORD ?? "Admin@123";
const NAME     = process.env.SEED_NAME     ?? "Super Admin";

function normalizeConnectionString(url) {
  return url.replace(/([?&]sslmode=)(prefer|require|verify-ca)(\b|$)/g, "$1verify-full$3");
}

async function main() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    console.error("❌  DATABASE_URL is not set.");
    process.exit(1);
  }

  const connectionString = normalizeConnectionString(rawUrl);
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
    if (existing) {
      if (existing.role === "SUPER_ADMIN") {
        console.log(`ℹ️  User ${EMAIL} already exists as SUPER_ADMIN — skipping.`);
      } else {
        // Upgrade role to SUPER_ADMIN and set/update password
        const passwordHash = await bcrypt.hash(PASSWORD, 12);
        await prisma.user.update({
          where: { email: EMAIL },
          data: { role: "SUPER_ADMIN", passwordHash },
        });
        console.log(`✅  Upgraded ${EMAIL} to SUPER_ADMIN and updated password.`);
      }
      return;
    }

    const passwordHash = await bcrypt.hash(PASSWORD, 12);

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const user = await prisma.user.create({
      data: {
        email: EMAIL,
        name: NAME,
        passwordHash,
        role: "SUPER_ADMIN",
        workspace: {
          create: {
            name: `${NAME.split(" ")[0]}'s Workspace`,
            planId: "lite",
            creditLedger: {
              create: {
                monthlyAllocation: 30_000,
                bonusCredits: 0,
                usedThisPeriod: 0,
                periodStart: new Date(),
                periodEnd,
              },
            },
          },
        },
      },
      select: { id: true, email: true, role: true },
    });

    console.log(`✅  Created SUPER_ADMIN user:`);
    console.log(`    ID:    ${user.id}`);
    console.log(`    Email: ${user.email}`);
    console.log(`    Role:  ${user.role}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("❌  Seeder failed:", err.message ?? err);
  process.exit(1);
});
