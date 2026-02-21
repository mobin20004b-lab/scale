-- CreateEnum
CREATE TYPE "ScaleDeviceType" AS ENUM ('ESP32');

-- CreateEnum
CREATE TYPE "PrinterType" AS ENUM ('TSPL', 'ESC_POS');

-- CreateEnum
CREATE TYPE "ScaleCommandType" AS ENUM ('PRINT_LABEL', 'PRINT_TEST', 'SET_CONFIG', 'RESTART');

-- CreateEnum
CREATE TYPE "ScaleCommandStatus" AS ENUM ('PENDING', 'SENT', 'ACKED', 'FAILED', 'EXPIRED');

-- AlterTable
ALTER TABLE "scales"
ADD COLUMN "config" JSONB,
ADD COLUMN "deviceType" "ScaleDeviceType" NOT NULL DEFAULT 'ESP32',
ADD COLUMN "firmwareVersion" TEXT,
ADD COLUMN "lastSeenAt" TIMESTAMP(3),
ADD COLUMN "printerConnection" JSONB,
ADD COLUMN "printerType" "PrinterType";

-- CreateTable
CREATE TABLE "scale_commands" (
    "id" TEXT NOT NULL,
    "scaleId" TEXT NOT NULL,
    "type" "ScaleCommandType" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ScaleCommandStatus" NOT NULL DEFAULT 'PENDING',
    "nonce" TEXT,
    "requestedByUserId" TEXT,
    "sentAt" TIMESTAMP(3),
    "ackedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scale_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scale_telemetry" (
    "id" TEXT NOT NULL,
    "scaleId" TEXT NOT NULL,
    "rssi" INTEGER,
    "freeHeap" INTEGER,
    "uptimeSec" INTEGER,
    "temperature" DOUBLE PRECISION,
    "battery" DOUBLE PRECISION,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scale_telemetry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scale_commands_scaleId_status_createdAt_idx" ON "scale_commands"("scaleId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "scale_commands_requestedByUserId_createdAt_idx" ON "scale_commands"("requestedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "scale_telemetry_scaleId_createdAt_idx" ON "scale_telemetry"("scaleId", "createdAt");

-- AddForeignKey
ALTER TABLE "scale_commands" ADD CONSTRAINT "scale_commands_scaleId_fkey" FOREIGN KEY ("scaleId") REFERENCES "scales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scale_telemetry" ADD CONSTRAINT "scale_telemetry_scaleId_fkey" FOREIGN KEY ("scaleId") REFERENCES "scales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
