-- Add libraryTemplateName to GlobalTemplate for Meta library-first provisioning.
-- Nullable, additive only. Null = custom template (existing behavior unchanged).
ALTER TABLE "GlobalTemplate" ADD COLUMN "libraryTemplateName" TEXT;
