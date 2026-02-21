import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import {
  getDefaultBusinessMonthRange,
  getTimeZoneLabel,
  reportQuerySchema,
  resolveBusinessTimeZone,
  toBusinessDayEnd,
  toBusinessDayStart,
} from "@/lib/business-timezone";
import { readSystemSettings } from "@/lib/system-settings";

function csvEscape(value: string | number) {
  const str = String(value);
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await readSystemSettings();
    const businessTimeZone = resolveBusinessTimeZone(settings.general.timezone);
    const defaultRange = getDefaultBusinessMonthRange(businessTimeZone);

    const { searchParams } = new URL(request.url);

    const parsed = reportQuerySchema.safeParse({
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      productId: searchParams.get("productId") ?? undefined,
      type: searchParams.get("type") ?? undefined,
    });

    const validQuery = parsed.success ? parsed.data : {};

    const startDate = validQuery.startDate ?? defaultRange.startDate;
    const endDate = validQuery.endDate ?? defaultRange.endDate;
    const type = validQuery.type ?? "all";
    const productId =
      validQuery.productId && validQuery.productId !== "all"
        ? validQuery.productId
        : undefined;

    const whereClause: any = {
      createdAt: {
        gte: toBusinessDayStart(startDate, businessTimeZone),
        lte: toBusinessDayEnd(endDate, businessTimeZone),
      },
    };

    if (productId) {
      whereClause.productId = productId;
    }

    const [stockIns, stockOuts] = await Promise.all([
      type === "all" || type === "in"
        ? prisma.stockIn.findMany({
            where: whereClause,
            include: {
              product: true,
              user: {
                select: {
                  full_name: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          })
        : Promise.resolve([]),

      type === "all" || type === "out"
        ? prisma.stockOut.findMany({
            where: whereClause,
            include: {
              product: true,
              user: {
                select: {
                  full_name: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          })
        : Promise.resolve([]),
    ]);

    const generatedAt = new Date();
    const totalRows = stockIns.length + stockOuts.length;

    const csvRows = [
      ["فرا داده", "مقدار"].map(csvEscape).join(","),
      ["generated_at", generatedAt.toISOString()].map(csvEscape).join(","),
      ["timezone", getTimeZoneLabel(businessTimeZone)].map(csvEscape).join(","),
      ["filter_start_date", startDate].map(csvEscape).join(","),
      ["filter_end_date", endDate].map(csvEscape).join(","),
      ["filter_type", type].map(csvEscape).join(","),
      ["filter_product", productId ?? "all"].map(csvEscape).join(","),
      ["row_count", totalRows].map(csvEscape).join(","),
      "",
      [
        "تاریخ",
        "نوع",
        "محصول",
        "مقدار",
        "واحد",
        "کاربر",
      ]
        .map(csvEscape)
        .join(","),
    ];

    stockIns.forEach((item) => {
      csvRows.push(
        [
          format(new Date(item.createdAt), "yyyy/MM/dd HH:mm"),
          "ورودی",
          item.product.name,
          item.quantity.toString(),
          item.product.unit,
          item.user.full_name,
        ]
          .map(csvEscape)
          .join(",")
      );
    });

    stockOuts.forEach((item) => {
      csvRows.push(
        [
          format(new Date(item.createdAt), "yyyy/MM/dd HH:mm"),
          "خروجی",
          item.product.name,
          item.quantity.toString(),
          item.product.unit,
          item.user.full_name,
        ]
          .map(csvEscape)
          .join(",")
      );
    });

    const csv = csvRows.join("\n");

    const bom = "\uFEFF";
    const csvWithBom = bom + csv;

    return new NextResponse(csvWithBom, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="warehouse-report-${format(generatedAt, "yyyy-MM-dd")}.csv"`,
        "X-Report-Row-Count": String(totalRows),
      },
    });
  } catch (error) {
    console.error("[v0] Error exporting report:", error);
    return NextResponse.json(
      { error: "Failed to export report" },
      { status: 500 }
    );
  }
}
