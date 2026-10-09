// Runs `prisma migrate deploy` ONLY on Vercel Preview deployments.
// Production builds skip this — production migrations are applied separately
// and deliberately, never as a build side effect.
//
// Why this exists: the Vercel build (`prisma generate && next build`) does not
// run migrations, so a fresh preview database would lack the branch's tables.
// Vercel injects the target=preview DATABASE_URL at build time, so the preview
// build itself is the safest place to bring the preview DB up to date.
// `migrate deploy` is idempotent: it applies only pending migrations.
import { execSync } from "node:child_process";

const env = process.env.VERCEL_ENV ?? "unset";

if (env === "preview") {
  console.log("[migrate-preview] VERCEL_ENV=preview — running `prisma migrate deploy`");
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  console.log("[migrate-preview] done");
} else {
  console.log(`[migrate-preview] skipping (VERCEL_ENV=${env})`);
}
