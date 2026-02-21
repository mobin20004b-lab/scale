import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PrintAttemptRequest = {
  stockInIds?: string[];
  labelSize?: "50x30" | "60x40";
  outcome?: "attempted" | "blocked" | "printed";
  details?: string;
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as PrintAttemptRequest;
  if (!body.outcome) {
    return NextResponse.json({ error: "outcome is required" }, { status: 400 });
  }

  const ids = (body.stockInIds ?? []).filter(Boolean);

  await prisma.activity.create({
    data: {
      userId: (session.user as any).id,
      action: "تلاش چاپ لیبل",
      entity: "PrintJob",
      entityId: ids[0] ?? "-",
      details: `outcome:${body.outcome};size:${body.labelSize ?? "50x30"};count:${ids.length};${body.details ?? ""}`,
    },
  });

  return NextResponse.json({ ok: true });
}
