import { NextResponse } from "next/server";
import { requireSession } from "@/lib/route-guards";
import { prisma } from "@/lib/prisma";
import { requestDelete } from "@/lib/deletion-lifecycle";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireSession();
    if ("error" in guard) {
      return guard.error;
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
    const guard = await requireSession({ adminOnly: true });
    if ("error" in guard) {
      return guard.error;
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
      deviceType,
      firmwareVersion,
      printerType,
      printerConnection,
      config,
      lastSeenAt,
      minFirmwareVersion,
      retiredAt,
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
        deviceType: deviceType ?? undefined,
        firmwareVersion:
          firmwareVersion === undefined ? undefined : firmwareVersion || null,
        printerType: printerType ?? undefined,
        printerConnection:
          printerConnection === undefined ? undefined : printerConnection || null,
        config: config === undefined ? undefined : config || null,
        lastSeenAt:
          lastSeenAt === undefined
            ? undefined
            : lastSeenAt
              ? new Date(lastSeenAt)
              : null,
        minFirmwareVersion:
          minFirmwareVersion === undefined ? undefined : minFirmwareVersion || null,
        retiredAt:
          retiredAt === undefined
            ? undefined
            : retiredAt
              ? new Date(retiredAt)
              : null,
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
    const guard = await requireSession({ adminOnly: true });
    if ("error" in guard) {
      return guard.error;
    }

    const { id } = await context.params;
    const result = await requestDelete("scale", id);

    return NextResponse.json(result.body, { status: result.status });
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
