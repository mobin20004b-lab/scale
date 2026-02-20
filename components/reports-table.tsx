import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { faIR } from "date-fns/locale"
import { FileText } from "lucide-react"

interface StockIn {
  id: number
  quantity: number
  supplier: string | null
  reference_number: string | null
  created_at: Date
  product: {
    name: string
    unit: string
  }
  user: {
    full_name: string
  }
}

interface StockOut {
  id: number
  quantity: number
  recipient: string | null
  reference_number: string | null
  created_at: Date
  product: {
    name: string
    unit: string
  }
  user: {
    full_name: string
  }
}

interface ReportsTableProps {
  stockIns: StockIn[]
  stockOuts: StockOut[]
  type: string
}

export function ReportsTable({ stockIns, stockOuts, type }: ReportsTableProps) {
  // Combine and sort transactions
  const transactions = [
    ...stockIns.map(item => ({
      id: `in-${item.id}`,
      type: 'in' as const,
      product: item.product.name,
      unit: item.product.unit,
      quantity: Number(item.quantity),
      party: item.supplier || '-',
      reference: item.reference_number || '-',
      user: item.user.full_name,
      date: new Date(item.created_at)
    })),
    ...stockOuts.map(item => ({
      id: `out-${item.id}`,
      type: 'out' as const,
      product: item.product.name,
      unit: item.product.unit,
      quantity: Number(item.quantity),
      party: item.recipient || '-',
      reference: item.reference_number || '-',
      user: item.user.full_name,
      date: new Date(item.created_at)
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime())

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-5" />
          جزئیات تراکنش‌ها
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>تاریخ</TableHead>
                <TableHead>نوع</TableHead>
                <TableHead>محصول</TableHead>
                <TableHead>مقدار</TableHead>
                <TableHead>طرف معامله</TableHead>
                <TableHead>شماره مرجع</TableHead>
                <TableHead>کاربر</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    تراکنشی یافت نشد
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {format(transaction.date, 'yyyy/MM/dd HH:mm', { locale: faIR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={transaction.type === 'in' ? 'default' : 'secondary'}>
                        {transaction.type === 'in' ? 'ورودی' : 'خروجی'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{transaction.product}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {transaction.type === 'in' ? '+' : '-'}
                        {transaction.quantity.toFixed(2)} {transaction.unit}
                      </Badge>
                    </TableCell>
                    <TableCell>{transaction.party}</TableCell>
                    <TableCell dir="ltr" className="text-right">
                      {transaction.reference}
                    </TableCell>
                    <TableCell>{transaction.user}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
