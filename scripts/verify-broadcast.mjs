/**
 * Verify broadcast readiness and post-send state.
 *
 * Usage:
 *   node scripts/verify-broadcast.mjs          — pre-flight check
 *   node scripts/verify-broadcast.mjs --after  — post-send audit (pass --broadcastId=xxx)
 *
 * Reads .env.local automatically.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);

// Load .env.local
try {
  const lines = readFileSync(join(process.cwd(), ".env.local"), "utf8").split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("="); if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
} catch { /* ignore */ }

if (!process.env.DATABASE_URL) { console.error("FATAL: DATABASE_URL not set"); process.exit(1); }

const pg = require("pg");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const WORKSPACE_ID = process.env.SEED_WORKSPACE_ID ?? "cmsxkrd8h000104l5nx09ej10";
const PAGE_META_ID = "1406845895843093";

const args = process.argv.slice(2);
const after = args.includes("--after");
const broadcastId = args.find(a => a.startsWith("--broadcastId="))?.split("=")[1];

console.log("═══════════════════════════════════════════════════════");
console.log(`[verify-broadcast] workspaceId=${WORKSPACE_ID}`);
console.log("═══════════════════════════════════════════════════════\n");

// ── 1. Page ───────────────────────────────────────────────────────────────────
const pageRes = await client.query(
  `SELECT id, "pageName", "isActive", "webhookSubscribed", "updatedAt"
   FROM "FacebookPage" WHERE "pageId"=$1 AND "workspaceId"=$2 LIMIT 1`,
  [PAGE_META_ID, WORKSPACE_ID]
);
if (pageRes.rows.length === 0) {
  console.error("✗ No FacebookPage found — run connect-test-page.mjs first");
} else {
  const p = pageRes.rows[0];
  console.log(`Page: "${p.pageName}" (dbId=${p.id})`);
  console.log(`  isActive=${p.isActive}  webhookSubscribed=${p.webhookSubscribed}`);
}
const pageDbId = pageRes.rows[0]?.id;

// ── 2. Contacts ───────────────────────────────────────────────────────────────
if (pageDbId) {
  const contactRes = await client.query(
    `SELECT id, name, "metaUserId", "isSubscribed",
            "lastMessageAt", "relationshipVerifiedAt", "totalMessages"
     FROM "Contact" WHERE "workspaceId"=$1 AND "pageId"=$2
     ORDER BY "lastMessageAt" DESC LIMIT 10`,
    [WORKSPACE_ID, pageDbId]
  );
  console.log(`\nContacts for this page (${contactRes.rows.length}):`);
  const now = Date.now();
  for (const c of contactRes.rows) {
    const lastMsg  = c.lastMessageAt  ? new Date(c.lastMessageAt)  : null;
    const verified = c.relationshipVerifiedAt ? new Date(c.relationshipVerifiedAt) : null;
    const windowOpen = lastMsg && (now - lastMsg.getTime()) < 86_400_000;
    console.log(`  id=${c.id}`);
    console.log(`    psid=${c.metaUserId}  name=${c.name ?? "(none)"}`);
    console.log(`    isSubscribed=${c.isSubscribed}  totalMessages=${c.totalMessages}`);
    console.log(`    lastMessageAt=${lastMsg?.toISOString() ?? "null"}  24h-window=${windowOpen ? "OPEN ✓" : "CLOSED ✗"}`);
    console.log(`    relationshipVerifiedAt=${verified?.toISOString() ?? "null"}`);
  }
}

// ── 3. Credit Ledger ──────────────────────────────────────────────────────────
const creditRes = await client.query(
  `SELECT "monthlyAllocation","bonusCredits","usedThisPeriod","unlimitedCredits","periodEnd"
   FROM "CreditLedger" WHERE "workspaceId"=$1 LIMIT 1`,
  [WORKSPACE_ID]
);
if (creditRes.rows.length === 0) {
  console.error("\n✗ No CreditLedger — workspace may not have been created via Clerk webhook");
} else {
  const l = creditRes.rows[0];
  const avail = l.monthlyAllocation + l.bonusCredits - l.usedThisPeriod;
  console.log(`\nCreditLedger:`);
  console.log(`  allocation=${l.monthlyAllocation}  bonus=${l.bonusCredits}  used=${l.usedThisPeriod}`);
  console.log(`  available=${avail}  unlimited=${l.unlimitedCredits}`);
  console.log(`  periodEnd=${new Date(l.periodEnd).toISOString()}`);
}

// ── 4. GlobalTemplates ────────────────────────────────────────────────────────
const tplRes = await client.query(
  `SELECT id, name, status, "isActive", "isUtility", content
   FROM "GlobalTemplate" WHERE status='active' AND "isActive"=true
   ORDER BY "createdAt" DESC LIMIT 10`
);
console.log(`\nActive GlobalTemplates (${tplRes.rows.length}):`);
for (const t of tplRes.rows) {
  console.log(`  [${t.id}] "${t.name}"  isUtility=${t.isUtility}`);
  console.log(`    content: ${t.content.slice(0, 80)}${t.content.length > 80 ? "..." : ""}`);
}
if (tplRes.rows.length === 0) {
  console.log("  ✗ None — create one in Admin → Templates before testing broadcasts");
}

// ── 5. Utility template registrations ─────────────────────────────────────────
const regRes = await client.query(
  `SELECT utr.id, utr.status, utr."metaTemplateName", utr."metaTemplateId",
          utr."templateId", utr."lastCheckedAt", utr."lastError"
   FROM "UtilityTemplateRegistration" utr
   WHERE utr."workspaceId" = $1`,
  [WORKSPACE_ID]
);
console.log(`\nUtilityTemplateRegistration rows (${regRes.rows.length}):`);
for (const r of regRes.rows) {
  console.log(`  [${r.id}] templateId=${r.templateId}`);
  console.log(`    status=${r.status}  metaName=${r.metaTemplateName}  metaId=${r.metaTemplateId ?? "null"}`);
  if (r.lastError) console.log(`    lastError: ${r.lastError}`);
}
if (regRes.rows.length === 0) {
  console.log("  None — utility templates must be registered via Admin → Templates → Register before use");
}

// ── 6. Post-send audit ────────────────────────────────────────────────────────
if (after && broadcastId) {
  console.log(`\n── Post-send audit for broadcastId=${broadcastId} ──`);

  const bRes = await client.query(
    `SELECT id, name, status, sent, delivered, read, failed, "skippedCount",
            "creditsUsed", "createdAt", "completedAt"
     FROM "Broadcast" WHERE id=$1 LIMIT 1`,
    [broadcastId]
  );
  if (bRes.rows.length === 0) {
    console.error("  ✗ Broadcast not found");
  } else {
    const b = bRes.rows[0];
    console.log(`  Broadcast "${b.name}"`);
    console.log(`    status=${b.status}  sent=${b.sent}  delivered=${b.delivered}  read=${b.read}`);
    console.log(`    failed=${b.failed}  skipped=${b.skippedCount}  creditsUsed=${b.creditsUsed}`);
    console.log(`    createdAt=${b.createdAt}  completedAt=${b.completedAt ?? "null (in progress)"}`);
  }

  const rRes = await client.query(
    `SELECT r.id, r.status, r."failureReason", m.status AS msgStatus, m."metaMessageId"
     FROM "BroadcastRecipient" r
     LEFT JOIN "Message" m ON m."broadcastId"=r."broadcastId" AND m."contactId"=r."contactId"
     WHERE r."broadcastId"=$1`,
    [broadcastId]
  );
  console.log(`\n  Recipients (${rRes.rows.length}):`);
  for (const r of rRes.rows) {
    console.log(`    ${r.id}: status=${r.status}  msg=${r.msgStatus ?? "none"}  mid=${r.metaMessageId ?? "none"}`);
    if (r.failureReason) console.log(`      reason: ${r.failureReason}`);
  }

  // Credit transactions generated by this broadcast
  const txRes = await client.query(
    `SELECT ct.type, ct.operation, ct.amount, ct."balanceAfter", ct."createdAt"
     FROM "CreditTransaction" ct
     JOIN "Message" m ON m.id = ct."messageId"
     WHERE m."broadcastId"=$1
     ORDER BY ct."createdAt" DESC`,
    [broadcastId]
  );
  console.log(`\n  Credit transactions (${txRes.rows.length}):`);
  for (const tx of txRes.rows) {
    console.log(`    ${tx.operation}: amount=${tx.amount}  balanceAfter=${tx.balanceAfter}`);
  }
}

await client.end();
console.log("\n[verify-broadcast] Done.");
