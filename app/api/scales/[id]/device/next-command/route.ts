import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateScaleDevice } from "@/lib/scale-device-auth";

const MIN_COMMAND_POLL_INTERVAL_MS = 500;

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

    const now = new Date();
    const scale = authResult.scale;
    if (scale.lastSeenAt && now.getTime() - scale.lastSeenAt.getTime() < MIN_COMMAND_POLL_INTERVAL_MS) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    await prisma.scale.update({
      where: { id },
      data: { lastSeenAt: now },
    });

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

    const ackNonce = randomUUID();
    const sent = await prisma.scaleCommand.update({
      where: { id: command.id },
      data: {
        status: "SENT",
        sentAt: now,
        ackNonce,
        ackNonceExpiresAt: new Date(now.getTime() + 5 * 60 * 1000),
      },
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
