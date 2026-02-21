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
    const commandId = String(body?.commandId || "");
    const ackNonce = String(body?.ackNonce || "");
    const status = body?.status === "FAILED" ? "FAILED" : "ACKED";

    if (!commandId || !ackNonce) {
      return NextResponse.json(
        { error: "commandId and ackNonce are required" },
        { status: 400 }
      );
    }

    const command = await prisma.scaleCommand.findFirst({
      where: { id: commandId, scaleId: id },
    });
    if (!command) {
      return NextResponse.json({ error: "Command not found" }, { status: 404 });
    }

    if (command.ackedNonce) {
      return NextResponse.json({ error: "Command already acknowledged" }, { status: 409 });
    }

    if (!command.ackNonce || command.ackNonce !== ackNonce) {
      return NextResponse.json({ error: "Invalid ack nonce" }, { status: 401 });
    }

    if (command.ackNonceExpiresAt && command.ackNonceExpiresAt < new Date()) {
      return NextResponse.json({ error: "Ack nonce expired" }, { status: 401 });
    }

    const updated = await prisma.scaleCommand.update({
      where: { id: commandId },
      data: {
        status,
        ackedAt: new Date(),
        ackedNonce: ackNonce,
        error: status === "FAILED" ? String(body?.error || "Device failed command") : null,
      },
    });

    return NextResponse.json({ command: updated });
  } catch (error) {
    console.error("[v0] Error acknowledging scale command:", error);
    return NextResponse.json(
      { error: "Failed to ack command" },
      { status: 500 }
    );
  }
}
