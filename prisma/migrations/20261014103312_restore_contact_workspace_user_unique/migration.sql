-- Restore the 2-column unique constraint on Contact.
--
-- Root cause: commit deb3176 changed the Prisma schema's Contact unique from
-- (workspaceId, metaUserId) to (workspaceId, pageId, metaUserId) without a
-- migration. Commit 505001c reverted the schema, but its migration
-- (20261007090001_contact_page_scope) only added the partial 3-column index
-- and assumed the 2-column constraint still existed. On databases synced via
-- db push during the deb3176 window, it did not — breaking every
-- prisma.contact.upsert(where: { workspaceId_metaUserId }) with P2039/42P10
-- ("there is no unique or exclusion constraint matching the ON CONFLICT
-- specification"). Affected: POST /api/pages/[id]/scan and the Meta webhook
-- inbound-message handler.
--
-- This migration is purely additive: it creates the missing index and modifies
-- no data. The index name matches Prisma's naming convention for
-- @@unique([workspaceId, metaUserId]), closing the schema/migration drift.
-- It coexists with the partial page-scope index from
-- 20261007090001_contact_page_scope.
--
-- Pre-flight check (2026-10-14, preview database, hostname-verified):
--   SELECT "workspaceId", "metaUserId", COUNT(*) FROM "Contact"
--   GROUP BY "workspaceId", "metaUserId" HAVING COUNT(*) > 1;
-- returned 0 rows, so this CREATE UNIQUE INDEX is safe to apply.

CREATE UNIQUE INDEX "Contact_workspaceId_metaUserId_key"
  ON "Contact"("workspaceId", "metaUserId");
