import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateScaleDevice } from "@/lib/scale-device-auth";

export async function GET(
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

    const scale = await prisma.scale.findUnique({
      where: { id },
      select: {
        id: true,
        config: true,
        printerType: true,
        printerConnection: true,
        heartbeatIntervalSec: true,
        updatedAt: true,
      },
    });

    if (!scale) {
      return NextResponse.json({ error: "Scale not found" }, { status: 404 });
    }

    const effectiveConfig = {
      heartbeatIntervalSec: scale.heartbeatIntervalSec,
      ...(typeof scale.config === "object" && scale.config ? scale.config : {}),
      printerType: scale.printerType,
      printerConnection: scale.printerConnection,
    };

    const version = createHash("sha256")
      .update(JSON.stringify(effectiveConfig))
      .digest("hex")
      .slice(0, 16);

    return NextResponse.json({ config: effectiveConfig, version, updatedAt: scale.updatedAt });
  } catch (error) {
    console.error("[v0] Error fetching device config:", error);
    return NextResponse.json(
      { error: "Failed to fetch config" },
      { status: 500 }
    );
  }
}
