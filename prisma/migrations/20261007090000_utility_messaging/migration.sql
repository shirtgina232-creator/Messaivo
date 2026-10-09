-- Utility messaging (Meta API v26+): utility template registration + durable messaging outbox.
-- Safe migration: additive only. No columns dropped, no constraints dropped, no data deleted.
-- DEFAULTs applied to existing rows for new NOT NULL columns.
-- NOTE: the Contact unique-key change is intentionally NOT in this migration.
-- It is handled separately (and safely) in 20261007090001_contact_page_scope.

-- AlterTable
ALTER TABLE "FacebookPage" ADD COLUMN     "permissionError" TEXT,
ADD COLUMN     "permissionsCheckedAt" TIMESTAMP(3),
ADD COLUMN     "utilityPermissionGranted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "relationshipVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Broadcast" ADD COLUMN     "messagingType" TEXT,
ADD COLUMN     "metaTemplateName" TEXT,
ADD COLUMN     "utilityRegistrationId" TEXT;

-- AlterTable
ALTER TABLE "BroadcastRecipient" ADD COLUMN     "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "attemptId" TEXT,
ADD COLUMN     "nextAttemptAt" TIMESTAMP(3),
ADD COLUMN     "sendStartedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "GlobalTemplate" ADD COLUMN     "isUtility" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metaTemplateId" TEXT,
ADD COLUMN     "metaTemplateName" TEXT,
ADD COLUMN     "metaTemplateStatus" TEXT,
ADD COLUMN     "registeredForPageId" TEXT;

-- CreateTable
CREATE TABLE "UtilityTemplateRegistration" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "parameterKeys" TEXT[],
    "metaTemplateId" TEXT,
    "metaTemplateName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "lastCheckedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UtilityTemplateRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessagingAttempt" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "recipientId" TEXT,
    "requestKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "payload" JSONB NOT NULL,
    "metaMessageId" TEXT,
    "error" TEXT,
    "charged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "MessagingAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UtilityTemplateRegistration_workspaceId_pageId_status_idx" ON "UtilityTemplateRegistration"("workspaceId", "pageId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UtilityTemplateRegistration_pageId_templateId_contentHash_key" ON "UtilityTemplateRegistration"("pageId", "templateId", "contentHash");

-- CreateIndex
CREATE INDEX "MessagingAttempt_pageId_metaMessageId_idx" ON "MessagingAttempt"("pageId", "metaMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "MessagingAttempt_workspaceId_requestKey_key" ON "MessagingAttempt"("workspaceId", "requestKey");

-- CreateIndex
CREATE INDEX "BroadcastRecipient_metaMessageId_idx" ON "BroadcastRecipient"("metaMessageId");

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_utilityRegistrationId_fkey" FOREIGN KEY ("utilityRegistrationId") REFERENCES "UtilityTemplateRegistration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityTemplateRegistration" ADD CONSTRAINT "UtilityTemplateRegistration_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "FacebookPage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityTemplateRegistration" ADD CONSTRAINT "UtilityTemplateRegistration_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "GlobalTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
