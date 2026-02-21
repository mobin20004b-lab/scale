import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const COMMAND_WINDOW_MS = 60 * 1000;
const MAX_COMMANDS_PER_WINDOW = 20;

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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const take = Math.min(Number(searchParams.get("take") || 10), 50);

    const commands = await prisma.scaleCommand.findMany({
      where: {
        scaleId: id,
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
    });

    return NextResponse.json({ commands });
  } catch (error) {
    console.error("[v0] Error fetching scale commands:", error);
    return NextResponse.json(
      { error: "Failed to fetch scale commands" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const type = String(body?.type || "");

    if (!["PRINT_LABEL", "PRINT_TEST", "SET_CONFIG", "RESTART", "RETIRE"].includes(type)) {
      return NextResponse.json({ error: "Invalid command type" }, { status: 400 });
    }

    const scale = await prisma.scale.findUnique({
      where: { id },
      select: { id: true, retiredAt: true },
    });
    if (!scale) {
      return NextResponse.json({ error: "Scale not found" }, { status: 404 });
    }
    if (scale.retiredAt) {
      return NextResponse.json({ error: "Scale retired" }, { status: 403 });
    }

    const commandCount = await prisma.scaleCommand.count({
      where: {
        scaleId: id,
        createdAt: { gte: new Date(Date.now() - COMMAND_WINDOW_MS) },
      },
    });
    if (commandCount >= MAX_COMMANDS_PER_WINDOW) {
      return NextResponse.json(
        { error: "Command rate limit exceeded" },
        { status: 429 }
      );
    }

    const command = await prisma.scaleCommand.create({
      data: {
        scaleId: id,
        type: type as any,
        payload: body?.payload ?? {},
        nonce: crypto.randomUUID(),
        requestedByUserId: (session.user as any).id,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    return NextResponse.json({ command }, { status: 201 });
  } catch (error) {
    console.error("[v0] Error creating scale command:", error);
    return NextResponse.json(
      { error: "Failed to create scale command" },
      { status: 500 }
    );
  }
}
