-- CreateEnum
CREATE TYPE "BarcodeStatus" AS ENUM ('ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "BarcodeIdentifierType" AS ENUM ('PRODUCT_STATIC', 'PACKAGE_DYNAMIC', 'LOT_DYNAMIC', 'SUPPLIER_ALIAS');

-- CreateEnum
CREATE TYPE "BarcodeSymbology" AS ENUM ('EAN_13', 'EAN_8', 'CODE_128', 'QR', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "UnknownBarcodeStatus" AS ENUM ('OPEN', 'TEMP_RECEIVING', 'MAPPED');

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

-- CreateIndex
CREATE UNIQUE INDEX "product_barcodes_code_key" ON "product_barcodes"("code");

-- CreateIndex
CREATE INDEX "product_barcodes_productId_status_idx" ON "product_barcodes"("productId", "status");

-- CreateIndex
CREATE INDEX "unknown_barcode_events_normalizedCode_idx" ON "unknown_barcode_events"("normalizedCode");

-- CreateIndex
CREATE INDEX "unknown_barcode_events_status_idx" ON "unknown_barcode_events"("status");

-- AddForeignKey
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unknown_barcode_events" ADD CONSTRAINT "unknown_barcode_events_mappedProductId_fkey" FOREIGN KEY ("mappedProductId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
