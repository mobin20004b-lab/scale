-- CreateEnum
CREATE TYPE "ScaleStatus" AS ENUM ('ONLINE', 'DEGRADED', 'OFFLINE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "scales"
ADD COLUMN "status" "ScaleStatus" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN "outlierThreshold" DOUBLE PRECISION NOT NULL DEFAULT 25,
ADD COLUMN "stableWindowSize" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "lastHeartbeatAt" TIMESTAMP(3),
ADD COLUMN "lastStableWeight" DOUBLE PRECISION,
ADD COLUMN "unstableFlag" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "spikeFlag" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "scale_readings" (
  "id" TEXT NOT NULL,
  "scaleId" TEXT NOT NULL,
  "rawWeight" DOUBLE PRECISION NOT NULL,
  "normalizedWeight" DOUBLE PRECISION NOT NULL,
  "isOutlier" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "scale_readings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scale_readings_scaleId_createdAt_idx" ON "scale_readings"("scaleId", "createdAt");

-- AddForeignKey
ALTER TABLE "scale_readings" ADD CONSTRAINT "scale_readings_scaleId_fkey" FOREIGN KEY ("scaleId") REFERENCES "scales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
