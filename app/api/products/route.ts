import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ZodError } from "zod";
import { validationErrorResponse } from "@/lib/api-validation";
import { productPayloadSchema } from "@/lib/schemas/inventory";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(products);
  } catch {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = productPayloadSchema.parse(await request.json());

    const product = await prisma.product.create({
      data: {
        name: parsed.name,
        sku: parsed.sku || `PRD-${Date.now().toString(36).toUpperCase()}`,
        barcode: parsed.barcode,
        category: parsed.category || "بدون دسته‌بندی",
        unit: parsed.unit,
        minStock: parsed.minStock,
        weightPerUnit: parsed.weightPerUnit,
        description: parsed.description,
        currentStock: 0,
      },
    });

    await prisma.activity.create({
      data: {
        userId: (session.user as any).id,
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
