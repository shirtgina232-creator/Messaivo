-- Contact page-scoped dedup: partial unique index (safe with nullable pageId).
--
-- Background: the feature branch originally changed Contact's Prisma-level unique from
-- @@unique([workspaceId, metaUserId]) to @@unique([workspaceId, pageId, metaUserId]).
-- That is UNSAFE because pageId is nullable, and Postgres treats NULLs as distinct in
-- plain UNIQUE constraints — unlimited (workspaceId, NULL, metaUserId) duplicates would
-- be silently allowed, defeating dedup for contacts without a page.
--
-- This migration keeps the existing Prisma-level @@unique([workspaceId, metaUserId])
-- constraint intact (NOT dropped) and additionally enforces page-scoped dedup at the
-- database level for rows that DO have a pageId, via a partial unique index.
--
-- If this CREATE UNIQUE INDEX fails, it means duplicate (workspaceId, pageId, metaUserId)
-- rows already exist for non-null pageIds. Investigate and de-duplicate before retrying;
-- do NOT force it.
--
-- The index name intentionally matches Prisma's naming convention for the 3-column key,
-- so a future attempt to add that Prisma-level unique fails loudly instead of silently
-- double-enforcing.

CREATE UNIQUE INDEX "Contact_workspaceId_pageId_metaUserId_key"
  ON "Contact"("workspaceId", "pageId", "metaUserId")
  WHERE "pageId" IS NOT NULL;
