-- make every stock-in a mandatory lot
UPDATE "stock_ins" SET "lotBatch" = CONCAT('ENTRY-', "id") WHERE "lotBatch" IS NULL OR "lotBatch" = '';
ALTER TABLE "stock_ins" ALTER COLUMN "lotBatch" SET NOT NULL;

-- drop redundant metadata from stock-ins
ALTER TABLE "stock_ins"
  DROP COLUMN IF EXISTS "manualEntryReason",
  DROP COLUMN IF EXISTS "supplier",
  DROP COLUMN IF EXISTS "invoiceNumber",
  DROP COLUMN IF EXISTS "sourceDocumentType",
  DROP COLUMN IF EXISTS "sourceDocumentNumber",
  DROP COLUMN IF EXISTS "expiryDate",
  DROP COLUMN IF EXISTS "supplierLot",
  DROP COLUMN IF EXISTS "qualityResult",
  DROP COLUMN IF EXISTS "notes";

-- link stock-outs to a stock-in lot and remove redundant metadata
ALTER TABLE "stock_outs" ADD COLUMN "stockInId" TEXT;

UPDATE "stock_outs" so
SET "stockInId" = si."id"
FROM "stock_ins" si
WHERE so."stockInId" IS NULL
  AND so."productId" = si."productId"
  AND so."warehouseId" = si."warehouseId";

ALTER TABLE "stock_outs" ALTER COLUMN "stockInId" SET NOT NULL;
ALTER TABLE "stock_outs" ADD CONSTRAINT "stock_outs_stockInId_fkey" FOREIGN KEY ("stockInId") REFERENCES "stock_ins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "stock_outs_stockInId_idx" ON "stock_outs"("stockInId");

ALTER TABLE "stock_outs"
  DROP COLUMN IF EXISTS "customer",
  DROP COLUMN IF EXISTS "invoiceNumber",
  DROP COLUMN IF EXISTS "notes";
