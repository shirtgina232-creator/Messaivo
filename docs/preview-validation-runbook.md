# Preview validation runbook — `feat/utility-messaging`

Draft prepared 2026-10-07. All steps below are gated on Ash's approval.
Nothing here has been run, committed, pushed, or deployed.

## Why this exists

The Vercel build script is `prisma generate && next build` — no `prisma migrate deploy`
(package.json, verified 2026-10-07) — and `vercel.json` defines only the broadcast cron
(`0 0 * * *`). A preview deploy of `feat/utility-messaging` would therefore generate the
Prisma client from the new schema against a database that lacks the new tables/columns,
and every utility-template and broadcast path would fail at runtime with missing-table
errors. The two new migrations must reach the preview database before (or independently
of) the preview deploy:

- `prisma/migrations/20261007090000_utility_messaging/` — additive only. Adds columns to
  `FacebookPage`, `Contact`, `Broadcast`, `BroadcastRecipient`, `GlobalTemplate`; creates
  `UtilityTemplateRegistration` and `MessagingAttempt` tables plus indexes and FKs.
- `prisma/migrations/20261007090001_contact_page_scope/` — single partial unique index
  `Contact_workspaceId_pageId_metaUserId_key` on `("workspaceId","pageId","metaUserId")`
  WHERE `"pageId" IS NOT NULL`. Keeps the existing `@@unique([workspaceId, metaUserId])`.

Current local state (verified 2026-10-07): both migrations are **uncommitted** in
`~/workspace/messaivo-work` on branch `feat/utility-messaging` @ 1b8332c; applied to
**no** database.

## Option A — manual `prisma migrate deploy` against the preview DB (Ash's pending choice)

1. **Confirm the preview database is NOT the production database.** This is the unanswered
   safety question. If preview shares production: the partial index would be created on
   live `Contact` data; if duplicates exist, index creation errors without changing data
   but blocks the deploy. In that case either run the de-dup first or do not use Option A.
2. From a machine that can reach the preview database, on `feat/utility-messaging`:
   ```bash
   cd ~/workspace/messaivo-work
   git status --short   # expect the two untracked prisma/migrations/2026100709* dirs
   ```
3. Baseline check (read-only):
   ```bash
   DATABASE_URL="<PREVIEW_DATABASE_URL>" npx prisma migrate status
   ```
   Expect: `20260909_add_broadcast_ineligible_skipped` applied; the two
   `20261007090000/01` migrations pending.
4. Pre-flight duplicate check (read-only; already shared with Ash):
   ```sql
   SELECT "workspaceId", "pageId", "metaUserId", COUNT(*)
   FROM "Contact" WHERE "pageId" IS NOT NULL
   GROUP BY "workspaceId", "pageId", "metaUserId" HAVING COUNT(*) > 1;
   ```
   If rows return, de-duplicate before step 5. Do not force the index.
5. Apply, in order (Prisma runs each migration in a transaction on Postgres):
   ```bash
   DATABASE_URL="<PREVIEW_DATABASE_URL>" npx prisma migrate deploy
   ```
6. Verify: `DATABASE_URL="<PREVIEW_DATABASE_URL>" npx prisma migrate status` — all applied.
7. Deploy the preview. **Note:** this branch has never been pushed; pushing
   `feat/utility-messaging` to origin also needs Ash's explicit approval.
8. Before the preview deploy, complete the pre-deploy checklist: auth-gate or remove
   `src/app/api/debug/db-check/route.ts`, supply preview env vars
   (`DATABASE_URL`, `CLERK_*`, `META_APP_ID`, `META_APP_SECRET`, `META_CONFIG_ID`,
   `META_TOKEN_ENCRYPTION_KEY`, `META_WEBHOOK_VERIFY_TOKEN`, `CRON_SECRET`, `APP_URL`),
   and plan the 'reconnect your Page' nudge for the new `pages_utility_messaging` grant.

## Option B — add a migrate step to the build pipeline (NOT authorised)

Would mean changing the build to `prisma migrate deploy && prisma generate && next build`
(or a `vercel-build` script). Not done; awaiting Ash's approval. Trade-off: convenient
and automatic, but every future preview/prod build runs migrations — the production
deploy then applies DB changes implicitly, which is why this needs an explicit decision.

## Rollback notes (preview DB only)

- Both migrations are additive; rolling back is safe and loses no data.
- `prisma migrate deploy` runs each migration in a transaction: a failed migration leaves
  no partial state. After fixing the cause (e.g. de-dup), re-run step 5.
- To undo the partial index only: `DROP INDEX IF EXISTS "Contact_workspaceId_pageId_metaUserId_key";`
  then `prisma migrate resolve --rolled-back "20261007090001_contact_page_scope"`.
- To undo `20261007090000_utility_messaging` entirely: drop tables
  `"UtilityTemplateRegistration"`, `"MessagingAttempt"`, the FKs, indexes and added
  columns manually, then `prisma migrate resolve --rolled-back "20261007090000_utility_messaging"`.
  There is no data to preserve on a preview database.
