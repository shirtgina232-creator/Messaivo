/**
 * Seed the Plan table with the five standard Messaivo plans.
 * Idempotent — uses upsert on the unique slug field, so re-running is safe.
 *
 * Usage:
 *   node scripts/seed-plans.mjs
 *
 * DATABASE_URL is loaded automatically from .env.local if not already set.
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local if DATABASE_URL is not already set
if (!process.env.DATABASE_URL) {
  try {
    const envPath = resolve(__dirname, "../.env.local");
    const lines = readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local not found — rely on process.env already having DATABASE_URL
  }
}

if (!process.env.DATABASE_URL) {
  console.error("❌  DATABASE_URL is not set and could not be loaded from .env.local");
  process.exit(1);
}

const { PrismaClient } = await import("@prisma/client");
const { PrismaPg } = await import("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PLANS = [
  {
    slug: "lite",
    name: "Lite",
    description: "Free forever — perfect for getting started.",
    monthlyPrice: 0,
    monthlyCredits: 30_000,
    features: ["30,000 credits/month", "1 Facebook Page", "Basic inbox", "Community support"],
    isRecommended: false,
    displayOrder: 0,
    isActive: true,
    premiumInbox: false,
  },
  {
    slug: "starter",
    name: "Starter",
    description: "For small teams ramping up on customer messaging.",
    monthlyPrice: 19,
    yearlyPrice: 190,
    monthlyCredits: 300_000,
    features: ["300,000 credits/month", "3 Facebook Pages", "Priority inbox", "Email support", "Broadcasts"],
    isRecommended: false,
    displayOrder: 1,
    isActive: true,
    premiumInbox: false,
  },
  {
    slug: "growth",
    name: "Growth",
    description: "Scale your messaging with more power and pages.",
    monthlyPrice: 49,
    yearlyPrice: 490,
    monthlyCredits: 800_000,
    features: ["800,000 credits/month", "10 Facebook Pages", "Priority inbox", "Analytics", "Priority support"],
    isRecommended: true,
    displayOrder: 2,
    isActive: true,
    premiumInbox: false,
  },
  {
    slug: "pro",
    name: "Pro",
    description: "For growing businesses with high-volume messaging needs.",
    monthlyPrice: 99,
    yearlyPrice: 990,
    monthlyCredits: 2_000_000,
    features: ["2,000,000 credits/month", "25 Facebook Pages", "Premium inbox", "Advanced analytics", "Dedicated support"],
    isRecommended: false,
    displayOrder: 3,
    isActive: true,
    premiumInbox: true,
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    description: "Unlimited scale with dedicated infrastructure and support.",
    monthlyPrice: 249,
    yearlyPrice: 2_490,
    monthlyCredits: 4_500_000,
    features: [
      "4,500,000 credits/month",
      "Unlimited Pages",
      "Premium inbox",
      "Custom integrations",
      "SLA",
      "Dedicated account manager",
    ],
    isRecommended: false,
    displayOrder: 4,
    isActive: true,
    premiumInbox: true,
  },
];

async function main() {
  console.log("Seeding plans…\n");
  for (const plan of PLANS) {
    const result = await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
    const price = result.monthlyPrice === 0 ? "free" : `$${result.monthlyPrice}/mo`;
    console.log(`  ✓  ${result.name.padEnd(12)} ${price.padEnd(10)}  ${result.monthlyCredits.toLocaleString()} credits`);
  }
  console.log("\nDone — all 5 plans seeded.");
}

main()
  .catch((e) => { console.error("\n❌  Seed failed:", e?.message ?? e); process.exit(1); })
  .finally(() => prisma.$disconnect());
