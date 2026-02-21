import { NextResponse } from "next/server";
import { requireSession } from "@/lib/route-guards";
import { recoverDelete } from "@/lib/deletion-lifecycle";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireSession({ adminOnly: true });
    if ("error" in guard) {
      return guard.error;
    }

    const { id } = await context.params;
    const result = await recoverDelete("warehouse", id);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("[v0] Error recovering warehouse delete:", error);
    return NextResponse.json({ error: "Failed to recover warehouse" }, { status: 500 });
  }
}
