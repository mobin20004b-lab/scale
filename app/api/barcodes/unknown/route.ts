import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeBarcode } from "@/lib/barcode";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { barcode, source } = await request.json();
  const normalized = normalizeBarcode(String(barcode || ""));

  if (!normalized.normalized) {
    return NextResponse.json({ error: "Invalid barcode" }, { status: 400 });
  }

  const event = await prisma.unknownBarcodeEvent.create({
    data: {
      rawCode: normalized.raw,
      normalizedCode: normalized.normalized,
      source: source || null,
    },
  });

  return NextResponse.json(event, { status: 201 });
}
