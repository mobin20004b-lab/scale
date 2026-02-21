import { NextResponse } from "next/server";
import { requireSession } from "@/lib/route-guards";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const batchSchema = z.object({
  action: z.literal("adjustMinStock"),
  productIds: z.array(z.string().min(1)).min(1),
  minStock: z.number().min(0),
});

export async function POST(request: Request) {
  try {
    const guard = await requireSession({ adminOnly: true });
    if ("error" in guard) return guard.error;

    const parsed = batchSchema.parse(await request.json());

    await prisma.product.updateMany({
      where: { id: { in: parsed.productIds } },
      data: { minStock: parsed.minStock },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Batch update failed" }, { status: 400 });
  }
}
