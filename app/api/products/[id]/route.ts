import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ZodError } from "zod";
import { validationErrorResponse } from "@/lib/api-validation";
import { productPayloadSchema } from "@/lib/schemas/inventory";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const parsed = productPayloadSchema.parse(await request.json());

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: parsed.name,
        sku: parsed.sku || undefined,
        barcode: parsed.barcode,
        category: parsed.category || undefined,
        unit: parsed.unit,
        minStock: parsed.minStock,
        weightPerUnit: parsed.weightPerUnit,
        description: parsed.description,
      },
    });

    await prisma.activity.create({
      data: {
        userId: (session.user as any).id,
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
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        userId: (session.user as any).id,
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
