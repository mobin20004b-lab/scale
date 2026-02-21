import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import { decrementWarehouseInventory, incrementWarehouseInventory, InventoryConflictError } from "../../lib/inventory-ledger";

test("concurrent stock-out requests only allow one winner when stock is limited", async () => {
  const sku = `sku-${Date.now()}-${Math.random()}`;

  const user = await prisma.user.create({
    data: {
      username: `it-${Date.now()}`,
      full_name: "Integration Test",
      password: "secret",
      role: "ADMIN",
    },
  });

  const warehouse = await prisma.warehouse.create({
    data: { name: `IT Warehouse ${Date.now()}` },
  });

  const product = await prisma.product.create({
    data: {
      name: "Integration Product",
      sku,
      category: "IT",
      weightPerUnit: 1,
      unit: "pcs",
      minStock: 0,
      currentStock: 0,
    },
  });

  const stockIn = await prisma.stockIn.create({
    data: {
      productId: product.id,
      userId: user.id,
      warehouseId: warehouse.id,
      quantity: 1,
      weight: 1,
    },
  });

  await prisma.$transaction(async (tx) => {
    await incrementWarehouseInventory(tx, {
      productId: product.id,
      warehouseId: warehouse.id,
      quantity: 1,
      stockInId: stockIn.id,
      notes: "seed",
    });
  });

  const runStockOut = async () => {
    try {
      await prisma.$transaction(async (tx) => {
        await decrementWarehouseInventory(tx, {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: 1,
          notes: "test",
        });
      });
      return "success";
    } catch (error) {
      if (error instanceof InventoryConflictError) {
        return "conflict";
      }

      throw error;
    }
  };

  const [first, second] = await Promise.all([runStockOut(), runStockOut()]);
  const outcomes = [first, second].sort();

  assert.deepEqual(outcomes, ["conflict", "success"]);

  const balance = await prisma.warehouseInventoryBalance.findUnique({
    where: {
      productId_warehouseId_lotBatch: {
        productId: product.id,
        warehouseId: warehouse.id,
        lotBatch: "",
      },
    },
  });

  assert.equal(Number(balance?.quantity ?? 0), 0);

  await prisma.inventoryLedgerEntry.deleteMany({ where: { productId: product.id } });
  await prisma.warehouseInventoryBalance.deleteMany({ where: { productId: product.id } });
  await prisma.stockIn.deleteMany({ where: { productId: product.id } });
  await prisma.product.delete({ where: { id: product.id } });
  await prisma.warehouse.delete({ where: { id: warehouse.id } });
  await prisma.user.delete({ where: { id: user.id } });
});
