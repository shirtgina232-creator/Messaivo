-- AddColumn: ineligibleCount and skippedCount to Broadcast
-- Safe migration: additive only, no data deleted, DEFAULT 0 applied to existing rows.

ALTER TABLE "Broadcast"
  ADD COLUMN "ineligibleCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "skippedCount"    INTEGER NOT NULL DEFAULT 0;
