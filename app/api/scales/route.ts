import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scales = await prisma.scale.findMany({
      include: {
        warehouse: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(scales);
  } catch (error) {
    console.error("[v0] Error fetching scales:", error);
    return NextResponse.json(
      { error: "Failed to fetch scales" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    } = body;

    if (!name?.trim() || !warehouseId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const parsedPrecision = Number.isFinite(precision) ? Number(precision) : 2;
    const parsedHeartbeat = Number.isFinite(heartbeatIntervalSec)
      ? Number(heartbeatIntervalSec)
      : 1;

    const scale = await prisma.scale.create({
      data: {
        name: name.trim(),
        warehouseId,
        isActive: isActive ?? true,
        tare: Number.isFinite(tare) ? Number(tare) : 0,
        unit: unit?.trim() || "گرم",
        precision: Math.min(4, Math.max(0, parsedPrecision)),
        locationNote: locationNote?.trim() || null,
        heartbeatIntervalSec: Math.max(1, parsedHeartbeat),
        deviceType: deviceType ?? "ESP32",
        firmwareVersion: firmwareVersion?.trim() || null,
        printerType: printerType ?? null,
        printerConnection: printerConnection ?? null,
        config: config ?? null,
      },
      include: {
        warehouse: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(scale, { status: 201 });
  } catch (error) {
    console.error("[v0] Error creating scale:", error);
    return NextResponse.json(
      { error: "Failed to create scale" },
      { status: 500 }
    );
  }
}
