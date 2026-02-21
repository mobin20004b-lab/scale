import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderLabelDocument, type LabelSize, type LabelTemplateVersion } from "@/lib/label-print";

type LabelRequest = {
  mode: "test" | "stock-in";
  size?: LabelSize;
  templateVersion?: LabelTemplateVersion;
  stockInIds?: string[];
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as LabelRequest;
  const size = body.size ?? "50x30";
  const templateVersion = body.templateVersion ?? "v1";

  if (body.mode === "test") {
    const html = renderLabelDocument({
      size,
      templateVersion,
      labels: [
        {
          productName: "Test Product",
          barcode: "123456789012",
          weight: 1.25,
          unit: "kg",
          packedAt: new Date().toISOString(),
          lotNumber: "LOT-TEST-001",
          location: "A1-R2",
        },
      ],
    });

    return NextResponse.json({ html });
  }

  if (!body.stockInIds?.length) {
    return NextResponse.json({ error: "stockInIds is required" }, { status: 400 });
  }

  const stockIns = await prisma.stockIn.findMany({
    where: { id: { in: body.stockInIds } },
    include: {
      product: true,
      warehouse: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (stockIns.length === 0) {
    return NextResponse.json({ error: "No stock-in records found" }, { status: 404 });
  }

  const jobs = await prisma.$transaction(
    stockIns.map((item) =>
      prisma.printJob.create({
        data: {
          stockInId: item.id,
          userId: (session.user as any).id,
          templateVersion,
          labelSize: size,
          status: "QUEUED",
          payload: {
            productName: item.product.name,
            barcode: item.product.barcode ?? item.product.sku,
            weight: Number(item.quantity),
            unit: item.product.unit,
            packedAt: item.capturedAt?.toISOString() ?? item.createdAt.toISOString(),
            lotNumber: item.lotBatch,
            location: item.warehouse?.name,
          },
        },
      })
    )
  );

  const html = renderLabelDocument({
    size,
    templateVersion,
    labels: stockIns.map((item) => ({
      productName: item.product.name,
      barcode: item.product.barcode ?? item.product.sku,
      weight: Number(item.quantity),
      unit: item.product.unit,
      packedAt: item.capturedAt?.toISOString() ?? item.createdAt.toISOString(),
      lotNumber: item.lotBatch,
      location: item.warehouse?.name,
    })),
  });

  await prisma.$transaction(
    jobs.map((job) =>
      prisma.printJob.update({
        where: { id: job.id },
        data: { status: "SENT", sentAt: new Date() },
      })
    )
  );

  await prisma.activity.create({
    data: {
      userId: (session.user as any).id,
      action: "چاپ لیبل",
      entity: "PrintJob",
      entityId: jobs[0]?.id ?? "-",
      details: `${stockIns.length} لیبل با قالب ${templateVersion} و اندازه ${size} ارسال شد`,
    },
  });

  return NextResponse.json({ html, ids: stockIns.map((item) => item.id), jobIds: jobs.map((job) => job.id) });
}
