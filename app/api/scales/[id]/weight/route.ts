import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scaleLiveHub } from "@/lib/scale-live-hub";

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
      select: {
        id: true,
        lastWeight: true,
        lastWeightAt: true,
        isActive: true,
        tare: true,
        unit: true,
        precision: true,
      },
    });

    if (!scale) {
      return NextResponse.json({ error: "Scale not found" }, { status: 404 });
    }

    return NextResponse.json(scale);
  } catch (error) {
    console.error("[v0] Error fetching scale weight:", error);
    return NextResponse.json(
      { error: "Failed to fetch scale weight" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scale = await prisma.scale.findUnique({ where: { id } });
    if (!scale) {
      return NextResponse.json({ error: "Scale not found" }, { status: 404 });
    }

    if (scale.apiKey !== token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const weight = Number(body?.weight);

    if (!Number.isFinite(weight)) {
      return NextResponse.json({ error: "Invalid weight" }, { status: 400 });
    }

    const updatedScale = await prisma.scale.update({
      where: { id },
      select: {
        id: true,
        isActive: true,
        lastWeight: true,
        lastWeightAt: true,
        tare: true,
        unit: true,
        precision: true,
      },
      data: {
        lastWeight: weight,
        lastWeightAt: new Date(),
      },
    });

    scaleLiveHub.publish(updatedScale);

    return NextResponse.json({ success: true, weight });
  } catch (error) {
    console.error("[v0] Error updating scale weight:", error);
    return NextResponse.json(
      { error: "Failed to update scale weight" },
      { status: 500 }
    );
  }
}
