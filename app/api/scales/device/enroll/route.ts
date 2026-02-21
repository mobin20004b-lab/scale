import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const scaleId = String(body?.scaleId || "").trim();
    const bootstrapToken = String(body?.bootstrapToken || "").trim();
    const firmwareVersion =
      typeof body?.firmwareVersion === "string" ? body.firmwareVersion.trim() : null;

    if (!scaleId || !bootstrapToken) {
      return NextResponse.json(
        { error: "scaleId and bootstrapToken are required" },
        { status: 400 }
      );
    }

    const scale = await prisma.scale.findUnique({ where: { id: scaleId } });
    if (!scale) {
      return NextResponse.json({ error: "Scale not found" }, { status: 404 });
    }

    if (scale.retiredAt) {
      return NextResponse.json({ error: "Scale retired" }, { status: 403 });
    }

    if (!scale.bootstrapToken || scale.bootstrapToken !== bootstrapToken) {
      return NextResponse.json({ error: "Invalid bootstrap token" }, { status: 401 });
    }

    if (scale.bootstrapTokenExpiresAt && scale.bootstrapTokenExpiresAt < new Date()) {
      return NextResponse.json({ error: "Bootstrap token expired" }, { status: 401 });
    }

    const nextApiKey = randomUUID();
    const updated = await prisma.scale.update({
      where: { id: scaleId },
      data: {
        apiKey: nextApiKey,
        firmwareVersion: firmwareVersion || undefined,
        enrolledAt: new Date(),
        bootstrapToken: null,
        bootstrapTokenExpiresAt: null,
        lastSeenAt: new Date(),
      },
      select: {
        id: true,
        apiKey: true,
        enrolledAt: true,
      },
    });

    return NextResponse.json({
      scaleId: updated.id,
      apiKey: updated.apiKey,
      enrolledAt: updated.enrolledAt,
    });
  } catch (error) {
    console.error("[v0] Error enrolling scale:", error);
    return NextResponse.json({ error: "Failed to enroll scale" }, { status: 500 });
  }
}
