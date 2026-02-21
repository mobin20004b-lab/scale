import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateScaleDevice } from "@/lib/scale-device-auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authResult = await authenticateScaleDevice(
      id,
      request.headers.get("authorization") || ""
    );

    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();

    const telemetry = await prisma.scaleTelemetry.create({
      data: {
        scaleId: id,
        rssi: Number.isFinite(body?.rssi) ? Number(body.rssi) : null,
        freeHeap: Number.isFinite(body?.freeHeap) ? Number(body.freeHeap) : null,
        uptimeSec: Number.isFinite(body?.uptimeSec) ? Number(body.uptimeSec) : null,
        temperature: Number.isFinite(body?.temperature)
          ? Number(body.temperature)
          : null,
        battery: Number.isFinite(body?.battery) ? Number(body.battery) : null,
        payload: body?.payload ?? null,
      },
    });

    await prisma.scale.update({
      where: { id },
      data: {
        firmwareVersion:
          typeof body?.firmwareVersion === "string" ? body.firmwareVersion : undefined,
        lastSeenAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, telemetryId: telemetry.id });
  } catch (error) {
    console.error("[v0] Error saving scale telemetry:", error);
    return NextResponse.json(
      { error: "Failed to save telemetry" },
      { status: 500 }
    );
  }
}
