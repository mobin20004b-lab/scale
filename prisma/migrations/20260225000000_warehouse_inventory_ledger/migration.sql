-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('STOCK_IN', 'STOCK_OUT', 'STOCK_OUT_UNDO');

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
CREATE UNIQUE INDEX "warehouse_inventory_balances_productId_warehouseId_lotBatch_key" ON "warehouse_inventory_balances"("productId", "warehouseId", "lotBatch");

-- CreateIndex
CREATE INDEX "warehouse_inventory_balances_warehouseId_idx" ON "warehouse_inventory_balances"("warehouseId");

-- CreateIndex
CREATE INDEX "warehouse_inventory_balances_productId_idx" ON "warehouse_inventory_balances"("productId");

-- CreateIndex
CREATE INDEX "inventory_ledger_entries_productId_warehouseId_createdAt_idx" ON "inventory_ledger_entries"("productId", "warehouseId", "createdAt");

-- CreateIndex
CREATE INDEX "inventory_ledger_entries_movementType_createdAt_idx" ON "inventory_ledger_entries"("movementType", "createdAt");

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

-- Backfill balances from historic stock movements.
INSERT INTO "warehouse_inventory_balances" ("id", "productId", "warehouseId", "lotBatch", "quantity", "createdAt", "updatedAt")
SELECT
  'wb_' || md5(concat_ws('|', q."productId", q."warehouseId", coalesce(q."lotBatch", ''))),
  q."productId",
  q."warehouseId",
  coalesce(q."lotBatch", ''),
  SUM(q.delta) AS quantity,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT si."productId", si."warehouseId", coalesce(si."lotBatch", '') AS "lotBatch", si."quantity" AS delta
  FROM "stock_ins" si
  WHERE si."warehouseId" IS NOT NULL
  UNION ALL
  SELECT so."productId", so."warehouseId", '' AS "lotBatch", -so."quantity" AS delta
  FROM "stock_outs" so
  WHERE so."warehouseId" IS NOT NULL
) q
GROUP BY q."productId", q."warehouseId", q."lotBatch"
HAVING SUM(q.delta) <> 0;
