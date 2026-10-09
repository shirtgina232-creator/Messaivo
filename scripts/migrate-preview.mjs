// Runs `prisma migrate deploy` ONLY on Vercel Preview deployments.
// Production builds skip this — production migrations are applied separately
// and deliberately, never as a build side effect.
//
// Why this exists: the Vercel build (`prisma generate && next build`) does not
// run migrations, so a fresh preview database would lack the branch's tables.
// Vercel injects the target=preview DATABASE_URL at build time, so the preview
// build itself is the safest place to bring the preview DB up to date.
// `migrate deploy` is idempotent: it applies only pending migrations.
//
// P3005 handling: if the preview DB already has tables but no migration
// history (e.g. created via `prisma db push`), `migrate deploy` refuses with
// P3005 ("database schema is not empty"). In that case we baseline the
// pre-existing migrations (mark them applied without running them) and then
// deploy the new ones. The branch's own migrations are purely additive, so a
// wrong baseline can only fail loudly, never corrupt silently.
import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const env = process.env.VERCEL_ENV ?? "unset";
if (env !== "preview") {
  console.log(`[migrate-preview] skipping (VERCEL_ENV=${env})`);
  process.exit(0);
}

// Migrations introduced by this branch — never baseline these, always deploy.
const NEW_MIGRATIONS = new Set([
  "20261007090000_utility_messaging",
  "20261007090001_contact_page_scope",
]);

function run(cmd) {
  try {
    const out = execSync(cmd, { stdio: "pipe", encoding: "utf8" });
    process.stdout.write(out + "\n");
    return { ok: true, output: out };
  } catch (e) {
    const output = String(e.stdout ?? "") + String(e.stderr ?? "") + String(e.message ?? "");
    process.stdout.write(output + "\n");
    return { ok: false, output };
  }
}

function dbHost() {
  // Hostname only — never log credentials.
  try {
    const u = new URL(process.env.DATABASE_URL ?? "");
    return `${u.hostname}:${u.port || "5432"}`;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

console.log(`[migrate-preview] target DB host: ${dbHost()}`);
console.log("[migrate-preview] running `prisma migrate deploy`");
let r = run("npx prisma migrate deploy");

if (!r.ok && (r.output.includes("P3005") || r.output.includes("not empty"))) {
  console.log("[migrate-preview] P3005 detected — baselining pre-existing migrations");
  const dir = join(process.cwd(), "prisma", "migrations");
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".") || NEW_MIGRATIONS.has(name)) continue;
    console.log(`[migrate-preview] marking applied (baseline): ${name}`);
    const b = run(`npx prisma migrate resolve --applied "${name}"`);
    if (!b.ok) {
      console.error(`[migrate-preview] baseline failed for ${name} — aborting`);
      process.exit(1);
    }
  }
  console.log("[migrate-preview] retrying `prisma migrate deploy`");
  r = run("npx prisma migrate deploy");
}

if (!r.ok) {
  if (r.output.includes("P1002") || r.output.includes("Can't reach database server")) {
    console.error("");
    console.error("=================================================================");
    console.error("[migrate-preview] P1002: cannot reach the preview database server");
    console.error(`[migrate-preview] attempted host: ${dbHost()}`);
    console.error("[migrate-preview] The preview DATABASE_URL in the Vercel project");
    console.error("[migrate-preview] settings is unreachable from Vercel (wrong host,");
    console.error("[migrate-preview] stale/deleted database, or IP allow-listing).");
    console.error("[migrate-preview] Fix the target=preview DATABASE_URL value in the");
    console.error("[migrate-preview] Vercel dashboard, then rebuild. Aborting build.");
    console.error("=================================================================");
    console.error("");
  } else {
    console.error("[migrate-preview] migration failed — aborting build");
  }
  process.exit(1);
}
console.log("[migrate-preview] done");
