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

    await prisma.scale.update({
      where: { id },
      data: { lastSeenAt: new Date() },
    });

    const now = new Date();
    await prisma.scaleCommand.updateMany({
      where: {
        scaleId: id,
        status: { in: ["PENDING", "SENT"] },
        expiresAt: { lt: now },
      },
      data: { status: "EXPIRED", error: "Command expired" },
    });

    const command = await prisma.scaleCommand.findFirst({
      where: { scaleId: id, status: "PENDING" },
      orderBy: { createdAt: "asc" },
    });

    if (!command) {
      return NextResponse.json({ command: null });
    }

    const sent = await prisma.scaleCommand.update({
      where: { id: command.id },
      data: { status: "SENT", sentAt: new Date() },
    });

    return NextResponse.json({ command: sent });
  } catch (error) {
    console.error("[v0] Error pulling next scale command:", error);
    return NextResponse.json(
      { error: "Failed to fetch next command" },
      { status: 500 }
    );
  }
}
