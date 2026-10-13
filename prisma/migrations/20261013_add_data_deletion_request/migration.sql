-- CreateTable: DataDeletionRequest
-- Stores confirmation records for Meta User Data Deletion callbacks.
-- The Facebook PSID is never stored in plaintext; only its SHA-256 hash is kept.

CREATE TABLE "DataDeletionRequest" (
    "id" TEXT NOT NULL,
    "confirmationCode" TEXT NOT NULL,
    "userIdHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "deletedContacts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DataDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DataDeletionRequest_confirmationCode_key" ON "DataDeletionRequest"("confirmationCode");

-- CreateIndex
CREATE INDEX "DataDeletionRequest_createdAt_idx" ON "DataDeletionRequest"("createdAt");
