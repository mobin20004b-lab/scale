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
    const status = body?.status === "FAILED" ? "FAILED" : "ACKED";

    if (!commandId) {
      return NextResponse.json({ error: "commandId is required" }, { status: 400 });
    }

    const command = await prisma.scaleCommand.findFirst({
      where: { id: commandId, scaleId: id },
    });
    if (!command) {
      return NextResponse.json({ error: "Command not found" }, { status: 404 });
    }

    const updated = await prisma.scaleCommand.update({
      where: { id: commandId },
      data: {
        status,
        ackedAt: new Date(),
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
