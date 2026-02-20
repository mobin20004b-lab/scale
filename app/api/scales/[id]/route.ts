import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const scale = await prisma.scale.findUnique({
      where: { id },
      include: {
        warehouse: {
          select: { id: true, name: true },
        },
        _count: {
          select: { stockIns: true },
        },
      },
    });

    if (!scale) {
      return NextResponse.json({ error: "Scale not found" }, { status: 404 });
    }

    return NextResponse.json(scale);
  } catch (error) {
    console.error("[v0] Error fetching scale:", error);
    return NextResponse.json(
      { error: "Failed to fetch scale" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const {
      name,
      warehouseId,
      isActive,
      tare,
      unit,
      precision,
      locationNote,
      heartbeatIntervalSec,
    } = body;

    const parsedPrecision = Number.isFinite(precision)
      ? Number(precision)
      : undefined;
    const parsedHeartbeat = Number.isFinite(heartbeatIntervalSec)
      ? Number(heartbeatIntervalSec)
      : undefined;

    const scale = await prisma.scale.update({
      where: { id },
      data: {
        name: name?.trim(),
        warehouseId,
        isActive,
        tare: Number.isFinite(tare) ? Number(tare) : undefined,
        unit: unit?.trim(),
        precision:
          parsedPrecision === undefined
            ? undefined
            : Math.min(4, Math.max(0, parsedPrecision)),
        locationNote:
          locationNote === undefined ? undefined : locationNote?.trim() || null,
        heartbeatIntervalSec:
          parsedHeartbeat === undefined
            ? undefined
            : Math.max(1, parsedHeartbeat),
      },
      include: {
        warehouse: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(scale);
  } catch (error) {
    console.error("[v0] Error updating scale:", error);
    return NextResponse.json(
      { error: "Failed to update scale" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const scale = await prisma.scale.findUnique({
      where: { id },
      select: { id: true, _count: { select: { stockIns: true } } },
    });

    if (!scale) {
      return NextResponse.json({ error: "Scale not found" }, { status: 404 });
    }

    if ((scale._count.stockIns ?? 0) > 0) {
      await prisma.scale.update({
        where: { id },
        data: { isActive: false, archivedAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        archived: true,
        message:
          "این ترازو سابقه تراکنش دارد و برای حفظ تاریخچه آرشیو شد. برای حذف کامل باید ارجاعات تراکنش را پاک کنید.",
      });
    }

    await prisma.scale.delete({ where: { id } });

    return NextResponse.json({ success: true, archived: false });
  } catch (error) {
    console.error("[v0] Error deleting scale:", error);
    return NextResponse.json(
      {
        error:
          "حذف ترازو انجام نشد. اگر این ترازو سابقه تراکنش دارد آن را غیرفعال/آرشیو کنید.",
      },
      { status: 400 }
    );
  }
}
