import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ids, isActive, warehouseId } = body as {
      ids?: string[];
      isActive?: boolean;
      warehouseId?: string;
    };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "No scales selected" },
        { status: 400 }
      );
    }

    const data: { isActive?: boolean; warehouseId?: string } = {};
    if (typeof isActive === "boolean") {
      data.isActive = isActive;
    }
    if (warehouseId) {
      data.warehouseId = warehouseId;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No update operation provided" },
        { status: 400 }
      );
    }

    const result = await prisma.scale.updateMany({
      where: { id: { in: ids } },
      data,
    });

    return NextResponse.json({ success: true, updated: result.count });
  } catch (error) {
    console.error("[v0] Error applying bulk scale action:", error);
    return NextResponse.json(
      { error: "Failed to apply bulk action" },
      { status: 500 }
    );
  }
}
