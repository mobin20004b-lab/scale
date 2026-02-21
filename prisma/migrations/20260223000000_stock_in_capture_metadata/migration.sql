-- AlterTable
ALTER TABLE "stock_ins"
ADD COLUMN "capturedAt" TIMESTAMP(3),
ADD COLUMN "stableWindowMs" INTEGER,
ADD COLUMN "sourceScaleId" TEXT,
ADD COLUMN "confidence" DOUBLE PRECISION,
ADD COLUMN "captureSource" TEXT,
ADD COLUMN "manualEntryReason" TEXT;
