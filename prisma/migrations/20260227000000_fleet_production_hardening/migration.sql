-- AlterEnum
ALTER TYPE "ScaleCommandType" ADD VALUE IF NOT EXISTS 'RETIRE';

-- AlterTable
ALTER TABLE "scales"
ADD COLUMN "bootstrapToken" TEXT,
ADD COLUMN "bootstrapTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "enrolledAt" TIMESTAMP(3),
ADD COLUMN "retiredAt" TIMESTAMP(3),
ADD COLUMN "minFirmwareVersion" TEXT;

-- AlterTable
ALTER TABLE "scale_commands"
ADD COLUMN "ackNonce" TEXT,
ADD COLUMN "ackNonceExpiresAt" TIMESTAMP(3),
ADD COLUMN "ackedNonce" TEXT;

-- AlterTable
ALTER TABLE "scale_telemetry"
ADD COLUMN "rebootReason" TEXT,
ADD COLUMN "diagnostics" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "scales_bootstrapToken_key" ON "scales"("bootstrapToken");

-- CreateIndex
CREATE INDEX "scale_commands_ackNonce_idx" ON "scale_commands"("ackNonce");

-- CreateIndex
CREATE INDEX "scales_retiredAt_idx" ON "scales"("retiredAt");
