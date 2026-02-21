import { NextResponse } from "next/server";
import { requireSession } from "@/lib/route-guards";
import { prisma } from "@/lib/prisma";
import { ZodError } from "zod";
import { validationErrorResponse } from "@/lib/api-validation";
import { productPayloadSchema } from "@/lib/schemas/inventory";
import { normalizeBarcode } from "@/lib/barcode";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireSession({ adminOnly: true });
    if ("error" in guard) {
      return guard.error;
    }

    const { id } = await context.params;
    const parsed = productPayloadSchema.parse(await request.json());
    const normalizedPrimaryBarcode = parsed.barcode ? normalizeBarcode(parsed.barcode) : null;

    const product = await prisma.$transaction(async (tx) => {
      await tx.productBarcode.updateMany({
        where: { productId: id, status: "ACTIVE" },
        data: { status: "RETIRED", retiredAt: new Date() },
      });

      return tx.product.update({
        where: { id },
        data: {
          name: parsed.name,
          sku: parsed.sku || undefined,
          barcode: normalizedPrimaryBarcode?.normalized || null,
          category: parsed.category || undefined,
          unit: parsed.unit,
          minStock: parsed.minStock,
          weightPerUnit: parsed.weightPerUnit,
          description: parsed.description,
          barcodes: {
            create: [
              ...(normalizedPrimaryBarcode?.normalized
                ? [{
                    code: normalizedPrimaryBarcode.normalized,
                    identifierType: "PRODUCT_STATIC" as const,
                    symbology: normalizedPrimaryBarcode.symbology,
                    issuer: parsed.barcodeIssuer || null,
                    checksumValid: normalizedPrimaryBarcode.checksumValid,
                  }]
                : []),
              ...(parsed.barcodeAliases || []).map((code) => {
                const normalized = normalizeBarcode(code);
                return {
                  code: normalized.normalized,
                  identifierType: "SUPPLIER_ALIAS" as const,
                  symbology: normalized.symbology,
                  issuer: parsed.barcodeIssuer || "supplier",
                  checksumValid: normalized.checksumValid,
                };
              }),
            ],
          },
        },
        include: {
          barcodes: true,
        },
      });
    });

    await prisma.activity.create({
      data: {
        userId: (guard.session!.user as any).id,
        action: "ویرایش محصول",
        entity: "Product",
        entityId: product.id,
        details: `محصول "${parsed.name}" ویرایش شد`,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    console.error("[v0] Error updating product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireSession({ adminOnly: true });
    if ("error" in guard) {
      return guard.error;
    }

    const { id } = await context.params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await prisma.product.delete({
      where: { id },
    });

    await prisma.activity.create({
      data: {
        userId: (guard.session!.user as any).id,
        action: "حذف محصول",
        entity: "Product",
        entityId: product.id,
        details: `محصول "${product.name}" حذف شد`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[v0] Error deleting product:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
