import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CONFIG_SCHEMA_VERSION = 1;

export async function PATCH(
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
    const currentConfig = body?.config && typeof body.config === "object" ? body.config : {};

    const scale = await prisma.scale.update({
      where: { id },
      data: {
        config: {
          schemaVersion: CONFIG_SCHEMA_VERSION,
          ...(currentConfig as Record<string, unknown>),
        },
        printerType: body?.printerType ?? undefined,
        printerConnection: body?.printerConnection ?? undefined,
      },
      select: {
        id: true,
        config: true,
        printerType: true,
        printerConnection: true,
        updatedAt: true,
      },
    });

    await prisma.activity.create({
      data: {
        userId: (session.user as any).id,
        action: "به‌روزرسانی تنظیمات ترازو",
        entity: "Scale",
        entityId: id,
        details: "تنظیمات دستگاه و پرینتر به‌روزرسانی شد",
      },
    });

    return NextResponse.json(scale);
  } catch (error) {
    console.error("[v0] Error updating scale config:", error);
    return NextResponse.json(
      { error: "Failed to update scale config" },
      { status: 500 }
    );
  }
}
