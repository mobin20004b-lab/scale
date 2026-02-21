import { NextResponse } from "next/server";
import { requireSession } from "@/lib/route-guards";
import { prisma } from "@/lib/prisma";
import { ZodError } from "zod";
import { validationErrorResponse } from "@/lib/api-validation";
import { productPayloadSchema } from "@/lib/schemas/inventory";
import { normalizeBarcode } from "@/lib/barcode";

export async function GET() {
  try {
    const guard = await requireSession();
    if ("error" in guard) {
      return guard.error;
    }

    const products = await prisma.product.findMany({
      include: {
        barcodes: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(products);
  } catch {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireSession({ adminOnly: true });
    if ("error" in guard) {
      return guard.error;
    }

    const parsed = productPayloadSchema.parse(await request.json());

    const normalizedPrimaryBarcode = parsed.barcode ? normalizeBarcode(parsed.barcode) : null;

    const product = await prisma.product.create({
      data: {
        name: parsed.name,
        sku: parsed.sku || `PRD-${Date.now().toString(36).toUpperCase()}`,
        barcode: normalizedPrimaryBarcode?.normalized || null,
        category: parsed.category || "بدون دسته‌بندی",
        unit: parsed.unit,
        minStock: parsed.minStock,
        weightPerUnit: parsed.weightPerUnit,
        description: parsed.description,
        currentStock: 0,
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

    await prisma.activity.create({
      data: {
        userId: (guard.session!.user as any).id,
        action: "ایجاد محصول",
        entity: "Product",
        entityId: product.id,
        details: `محصول "${parsed.name}" ایجاد شد`,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    console.error("[v0] Error creating product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
