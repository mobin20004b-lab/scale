-- AlterTable
ALTER TABLE "products"
ADD COLUMN "deleteRequestedAt" TIMESTAMP(3),
ADD COLUMN "deleteCommitAfter" TIMESTAMP(3),
ADD COLUMN "deleteConflictAt" TIMESTAMP(3),
ADD COLUMN "deleteRequestedFromUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "warehouses"
ADD COLUMN "deleteRequestedAt" TIMESTAMP(3),
ADD COLUMN "deleteCommitAfter" TIMESTAMP(3),
ADD COLUMN "deleteConflictAt" TIMESTAMP(3),
ADD COLUMN "deleteRequestedFromUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "scales"
ADD COLUMN "deleteRequestedAt" TIMESTAMP(3),
ADD COLUMN "deleteCommitAfter" TIMESTAMP(3),
ADD COLUMN "deleteConflictAt" TIMESTAMP(3),
ADD COLUMN "deleteRequestedFromUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "products_deleteCommitAfter_idx" ON "products"("deleteCommitAfter");
CREATE INDEX "warehouses_deleteCommitAfter_idx" ON "warehouses"("deleteCommitAfter");
CREATE INDEX "scales_deleteCommitAfter_idx" ON "scales"("deleteCommitAfter");
