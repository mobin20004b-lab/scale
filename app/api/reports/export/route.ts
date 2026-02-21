import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { format } from "date-fns"
import {
  getDefaultBusinessMonthRange,
  getTimeZoneLabel,
  reportQuerySchema,
  resolveBusinessTimeZone,
  toBusinessDayEnd,
  toBusinessDayStart,
} from "@/lib/business-timezone"
import { readSystemSettings } from "@/lib/system-settings"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const settings = await readSystemSettings()
    const businessTimeZone = resolveBusinessTimeZone(settings.general.timezone)
    const defaultRange = getDefaultBusinessMonthRange(businessTimeZone)

    const { searchParams } = new URL(request.url)

    const parsed = reportQuerySchema.safeParse({
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      productId: searchParams.get("productId") ?? undefined,
      type: searchParams.get("type") ?? undefined,
    })

    const validQuery = parsed.success ? parsed.data : {}

    const startDate = validQuery.startDate ?? defaultRange.startDate
    const endDate = validQuery.endDate ?? defaultRange.endDate
    const type = validQuery.type ?? "all"
    const productId =
      validQuery.productId && validQuery.productId !== "all"
        ? validQuery.productId
        : undefined

    const whereClause: any = {
      createdAt: {
        gte: toBusinessDayStart(startDate, businessTimeZone),
        lte: toBusinessDayEnd(endDate, businessTimeZone),
      },
    }

    if (productId) {
      whereClause.productId = productId
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
    ])

    const csvRows = [
      ["فرا داده", "مقدار"].join(","),
      ["بازه شروع", startDate].join(","),
      ["بازه پایان", endDate].join(","),
      ["منطقه زمانی", getTimeZoneLabel(businessTimeZone)].join(","),
      ["نوع", type].join(","),
      ["محصول", productId ?? "all"].join(","),
      "",
      ["تاریخ", "نوع", "محصول", "مقدار", "واحد", "طرف معامله", "شماره مرجع", "کاربر"].join(","),
    ]

    stockIns.forEach((item) => {
      csvRows.push(
        [
          format(new Date(item.createdAt), "yyyy/MM/dd HH:mm"),
          "ورودی",
          item.product.name,
          item.quantity.toString(),
          item.product.unit,
          item.supplier || "-",
          item.invoiceNumber || "-",
          item.user.full_name,
        ].join(","),
      )
    })

    stockOuts.forEach((item) => {
      csvRows.push(
        [
          format(new Date(item.createdAt), "yyyy/MM/dd HH:mm"),
          "خروجی",
          item.product.name,
          item.quantity.toString(),
          item.product.unit,
          item.customer || "-",
          item.invoiceNumber || "-",
          item.user.full_name,
        ].join(","),
      )
    })

    const csv = csvRows.join("\n")

    const bom = "\uFEFF"
    const csvWithBom = bom + csv

    return new NextResponse(csvWithBom, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="warehouse-report-${format(new Date(), "yyyy-MM-dd")}.csv"`,
      },
    })
  } catch (error) {
    console.error("[v0] Error exporting report:", error)
    return NextResponse.json(
      { error: "Failed to export report" },
      { status: 500 },
    )
  }
}
