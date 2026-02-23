-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER', 'VIEWER');

-- CreateEnum
CREATE TYPE "BarcodeStatus" AS ENUM ('ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "BarcodeIdentifierType" AS ENUM ('PRODUCT_STATIC', 'PACKAGE_DYNAMIC', 'LOT_DYNAMIC', 'SUPPLIER_ALIAS');

-- CreateEnum
CREATE TYPE "BarcodeSymbology" AS ENUM ('EAN_13', 'EAN_8', 'CODE_128', 'QR', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PrintJobStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'REPRINT');

-- CreateEnum
CREATE TYPE "UnknownBarcodeStatus" AS ENUM ('OPEN', 'TEMP_RECEIVING', 'MAPPED');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('STOCK_IN', 'STOCK_OUT', 'STOCK_OUT_UNDO');

-- CreateEnum
CREATE TYPE "ScaleDeviceType" AS ENUM ('ESP32');

-- CreateEnum
CREATE TYPE "PrinterType" AS ENUM ('TSPL', 'ESC_POS');

-- CreateEnum
CREATE TYPE "ScaleCommandType" AS ENUM ('PRINT_LABEL', 'PRINT_TEST', 'SET_CONFIG', 'RESTART');

-- CreateEnum
CREATE TYPE "ScaleCommandStatus" AS ENUM ('PENDING', 'SENT', 'ACKED', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "qrCode" TEXT,
    "description" TEXT,
    "descriptionAr" TEXT,
    "category" TEXT NOT NULL,
    "minStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxStock" DOUBLE PRECISION,
    "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'قطعة',
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleteRequestedAt" TIMESTAMP(3),
    "deleteCommitAfter" TIMESTAMP(3),
    "deleteConflictAt" TIMESTAMP(3),
    "deleteRequestedFromUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_barcodes" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "identifierType" "BarcodeIdentifierType" NOT NULL DEFAULT 'PRODUCT_STATIC',
    "symbology" "BarcodeSymbology" NOT NULL DEFAULT 'CODE_128',
    "status" "BarcodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "issuer" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checksumValid" BOOLEAN,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_barcodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unknown_barcode_events" (
    "id" TEXT NOT NULL,
    "rawCode" TEXT NOT NULL,
    "normalizedCode" TEXT NOT NULL,
    "source" TEXT,
    "status" "UnknownBarcodeStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "mappedProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "unknown_barcode_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_ins" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "scaleId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "scaleWeight" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3),
    "stableWindowMs" INTEGER,
    "sourceScaleId" TEXT,
    "confidence" DOUBLE PRECISION,
    "captureSource" TEXT,
    "lotBatch" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleteRequestedAt" TIMESTAMP(3),
    "deleteCommitAfter" TIMESTAMP(3),
    "deleteConflictAt" TIMESTAMP(3),
    "deleteRequestedFromUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scales" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "bootstrapToken" TEXT,
    "bootstrapTokenExpiresAt" TIMESTAMP(3),
    "enrolledAt" TIMESTAMP(3),
    "retiredAt" TIMESTAMP(3),
    "minFirmwareVersion" TEXT,
    "deviceType" "ScaleDeviceType" NOT NULL DEFAULT 'ESP32',
    "firmwareVersion" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "printerType" "PrinterType",
    "printerConnection" JSONB,
    "config" JSONB,
    "warehouseId" TEXT NOT NULL,
    "tare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'گرم',
    "precision" INTEGER NOT NULL DEFAULT 2,
    "locationNote" TEXT,
    "heartbeatIntervalSec" INTEGER NOT NULL DEFAULT 1,
    "lastWeight" DOUBLE PRECISION,
    "lastWeightAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleteRequestedAt" TIMESTAMP(3),
    "deleteCommitAfter" TIMESTAMP(3),
    "deleteConflictAt" TIMESTAMP(3),
    "deleteRequestedFromUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "scales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scale_commands" (
    "id" TEXT NOT NULL,
    "scaleId" TEXT NOT NULL,
    "type" "ScaleCommandType" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ScaleCommandStatus" NOT NULL DEFAULT 'PENDING',
    "nonce" TEXT,
    "ackNonce" TEXT,
    "ackNonceExpiresAt" TIMESTAMP(3),
    "ackedNonce" TEXT,
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
    "rebootReason" TEXT,
    "diagnostics" JSONB,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scale_telemetry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_outs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "stockInId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_outs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_jobs" (
    "id" TEXT NOT NULL,
    "stockInId" TEXT,
    "userId" TEXT NOT NULL,
    "templateVersion" TEXT NOT NULL,
    "labelSize" TEXT NOT NULL,
    "status" "PrintJobStatus" NOT NULL DEFAULT 'QUEUED',
    "payload" JSONB NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),

    CONSTRAINT "print_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "responseStatus" INTEGER NOT NULL,
    "responseBody" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_inventory_balances" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "lotBatch" TEXT NOT NULL DEFAULT '',
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_inventory_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_ledger_entries" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "lotBatch" TEXT NOT NULL DEFAULT '',
    "quantityDelta" DOUBLE PRECISION NOT NULL,
    "movementType" "InventoryMovementType" NOT NULL,
    "stockInId" TEXT,
    "stockOutId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "products"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "products_qrCode_key" ON "products"("qrCode");

-- CreateIndex
CREATE UNIQUE INDEX "product_barcodes_code_key" ON "product_barcodes"("code");

-- CreateIndex
CREATE INDEX "product_barcodes_productId_status_idx" ON "product_barcodes"("productId", "status");

-- CreateIndex
CREATE INDEX "unknown_barcode_events_normalizedCode_idx" ON "unknown_barcode_events"("normalizedCode");

-- CreateIndex
CREATE INDEX "unknown_barcode_events_status_idx" ON "unknown_barcode_events"("status");

-- CreateIndex
CREATE INDEX "stock_ins_productId_idx" ON "stock_ins"("productId");

-- CreateIndex
CREATE INDEX "stock_ins_userId_idx" ON "stock_ins"("userId");

-- CreateIndex
CREATE INDEX "stock_ins_warehouseId_idx" ON "stock_ins"("warehouseId");

-- CreateIndex
CREATE INDEX "stock_ins_scaleId_idx" ON "stock_ins"("scaleId");

-- CreateIndex
CREATE INDEX "stock_ins_date_idx" ON "stock_ins"("date");

-- CreateIndex
CREATE UNIQUE INDEX "scales_apiKey_key" ON "scales"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "scales_bootstrapToken_key" ON "scales"("bootstrapToken");

-- CreateIndex
CREATE INDEX "scales_warehouseId_idx" ON "scales"("warehouseId");

-- CreateIndex
CREATE INDEX "scale_commands_scaleId_status_createdAt_idx" ON "scale_commands"("scaleId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "scale_commands_requestedByUserId_createdAt_idx" ON "scale_commands"("requestedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "scale_telemetry_scaleId_createdAt_idx" ON "scale_telemetry"("scaleId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_outs_productId_idx" ON "stock_outs"("productId");

-- CreateIndex
CREATE INDEX "stock_outs_stockInId_idx" ON "stock_outs"("stockInId");

-- CreateIndex
CREATE INDEX "stock_outs_userId_idx" ON "stock_outs"("userId");

-- CreateIndex
CREATE INDEX "stock_outs_warehouseId_idx" ON "stock_outs"("warehouseId");

-- CreateIndex
CREATE INDEX "stock_outs_date_idx" ON "stock_outs"("date");

-- CreateIndex
CREATE INDEX "activities_userId_idx" ON "activities"("userId");

-- CreateIndex
CREATE INDEX "activities_createdAt_idx" ON "activities"("createdAt");

-- CreateIndex
CREATE INDEX "print_jobs_status_createdAt_idx" ON "print_jobs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "print_jobs_stockInId_idx" ON "print_jobs"("stockInId");

-- CreateIndex
CREATE INDEX "idempotency_records_expiresAt_idx" ON "idempotency_records"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_key_endpoint_key" ON "idempotency_records"("key", "endpoint");

-- CreateIndex
CREATE INDEX "warehouse_inventory_balances_warehouseId_idx" ON "warehouse_inventory_balances"("warehouseId");

-- CreateIndex
CREATE INDEX "warehouse_inventory_balances_productId_idx" ON "warehouse_inventory_balances"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_inventory_balances_productId_warehouseId_lotBatch_key" ON "warehouse_inventory_balances"("productId", "warehouseId", "lotBatch");

-- CreateIndex
CREATE INDEX "inventory_ledger_entries_productId_warehouseId_createdAt_idx" ON "inventory_ledger_entries"("productId", "warehouseId", "createdAt");

-- CreateIndex
CREATE INDEX "inventory_ledger_entries_movementType_createdAt_idx" ON "inventory_ledger_entries"("movementType", "createdAt");

-- AddForeignKey
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unknown_barcode_events" ADD CONSTRAINT "unknown_barcode_events_mappedProductId_fkey" FOREIGN KEY ("mappedProductId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ins" ADD CONSTRAINT "stock_ins_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ins" ADD CONSTRAINT "stock_ins_scaleId_fkey" FOREIGN KEY ("scaleId") REFERENCES "scales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ins" ADD CONSTRAINT "stock_ins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ins" ADD CONSTRAINT "stock_ins_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scales" ADD CONSTRAINT "scales_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scale_commands" ADD CONSTRAINT "scale_commands_scaleId_fkey" FOREIGN KEY ("scaleId") REFERENCES "scales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scale_telemetry" ADD CONSTRAINT "scale_telemetry_scaleId_fkey" FOREIGN KEY ("scaleId") REFERENCES "scales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_outs" ADD CONSTRAINT "stock_outs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_outs" ADD CONSTRAINT "stock_outs_stockInId_fkey" FOREIGN KEY ("stockInId") REFERENCES "stock_ins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_outs" ADD CONSTRAINT "stock_outs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_outs" ADD CONSTRAINT "stock_outs_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_inventory_balances" ADD CONSTRAINT "warehouse_inventory_balances_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_inventory_balances" ADD CONSTRAINT "warehouse_inventory_balances_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger_entries" ADD CONSTRAINT "inventory_ledger_entries_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger_entries" ADD CONSTRAINT "inventory_ledger_entries_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger_entries" ADD CONSTRAINT "inventory_ledger_entries_stockInId_fkey" FOREIGN KEY ("stockInId") REFERENCES "stock_ins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger_entries" ADD CONSTRAINT "inventory_ledger_entries_stockOutId_fkey" FOREIGN KEY ("stockOutId") REFERENCES "stock_outs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
