/**
 * Diagnostic: show failure reasons for a broadcast's recipients.
 * Usage: node scripts/check-broadcast-failures.mjs <broadcastId>
 *        node scripts/check-broadcast-failures.mjs cmvo1o2fy000407l5342i2lma
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  const dotenv = require("dotenv");
  dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });
} catch {}

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

function normalizeConnectionString(url) {
  return url.replace(/([?&]sslmode=)(prefer|require|verify-ca)(\b|$)/g, "$1verify-full$3");
}

async function main() {
  const broadcastId = process.argv[2];
  if (!broadcastId) {
    console.error("Usage: node check-broadcast-failures.mjs <broadcastId>");
    process.exit(1);
  }

  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) { console.error("DATABASE_URL not set"); process.exit(1); }

  const adapter = new PrismaPg({ connectionString: normalizeConnectionString(rawUrl) });
  const prisma = new PrismaClient({ adapter });

  try {
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: broadcastId },
      select: { id: true, name: true, status: true, messagingType: true, sent: true, failed: true, message: true, pageId: true },
    });
    if (!broadcast) { console.error("Broadcast not found"); return; }
    console.log("\n=== BROADCAST ===");
    console.log(`  ID:      ${broadcast.id}`);
    console.log(`  Name:    ${broadcast.name}`);
    console.log(`  Status:  ${broadcast.status}`);
    console.log(`  Type:    ${broadcast.messagingType ?? "RESPONSE"}`);
    console.log(`  Sent:    ${broadcast.sent}  Failed: ${broadcast.failed}`);

    // Group failure reasons
    const failed = await prisma.broadcastRecipient.findMany({
      where: { broadcastId, status: "failed" },
      select: { failureReason: true, status: true },
      take: 200,
    });

    const reasonCounts = {};
    for (const r of failed) {
      const reason = r.failureReason ?? "(no reason stored)";
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    }

    console.log("\n=== FAILURE REASONS ===");
    const sorted = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) {
      console.log("  (no failed recipients found)");
    } else {
      for (const [reason, count] of sorted) {
        console.log(`  [${count}x]  ${reason}`);
      }
    }

    // Also check skipped
    const skipped = await prisma.broadcastRecipient.findMany({
      where: { broadcastId, status: "skipped" },
      select: { failureReason: true },
      take: 200,
    });
    if (skipped.length > 0) {
      const skipCounts = {};
      for (const r of skipped) {
        const reason = r.failureReason ?? "(no reason)";
        skipCounts[reason] = (skipCounts[reason] || 0) + 1;
      }
      console.log("\n=== SKIPPED REASONS ===");
      for (const [reason, count] of Object.entries(skipCounts).sort((a, b) => b[1] - a[1])) {
        console.log(`  [${count}x]  ${reason}`);
      }
    }

    // Check messaging attempts for error codes
    const attempts = await prisma.messagingAttempt.findMany({
      where: { broadcastId, status: "failed" },
      select: { error: true, status: true },
      take: 10,
    });
    if (attempts.length > 0) {
      console.log("\n=== SAMPLE ATTEMPT ERRORS (first 10) ===");
      for (const a of attempts) {
        console.log(`  ${a.status}: ${a.error}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
