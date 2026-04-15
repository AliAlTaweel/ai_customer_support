"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Order } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

export const columns: ColumnDef<Order>[] = [
  {
    accessorKey: "order_id",
    header: "Order ID",
    cell: ({ row }) => <span className="font-mono text-muted-foreground text-sm">#{row.getValue("order_id")}</span>
  },
  {
    accessorKey: "order_date",
    header: "Date",
    cell: ({ row }) => {
      const date = new Date(row.getValue("order_date"))
      return <span className="text-sm">{format(date, "MMM d, yyyy")}</span>
    }
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => <span className="capitalize text-sm">{row.getValue("category")}</span>
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"))
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount)
      return <div className="font-medium">{formatted}</div>
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      
      const badgeVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
        completed: "default",
        shipped: "secondary",
        pending: "outline",
        returned: "destructive",
        cancelled: "outline"
      }

      return (
        <Badge variant={badgeVariants[status.toLowerCase()] || "outline"} className="capitalize">
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: "payment_method",
    header: "Payment",
    cell: ({ row }) => <span className="text-xs text-muted-foreground uppercase opacity-70">{(row.getValue("payment_method") as string).replace("_", " ")}</span>
  }
]
