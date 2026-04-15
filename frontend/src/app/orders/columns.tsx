"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog"
import { ShoppingBag, Truck, CreditCard, Calendar, Package, Trash2 } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Order } from "@/lib/db"
import { deleteOrderAction } from "@/app/actions/orders"
import { useState } from "react"

function OrderDetails({ order }: { order: Order }) {
  let items = []
  try {
    items = order.items_json ? JSON.parse(order.items_json) : []
  } catch (e) {
    console.error("Failed to parse items", e)
  }

  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(order.amount)

  return (
    <DialogContent className="sm:max-w-[425px] bg-white">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
          <Package className="w-5 h-5 text-primary" />
          Order Modern Details
        </DialogTitle>
        <DialogDescription>
          Everything you need to know about order #{order.order_id}
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-6 py-4">
        {/* Status and Date */}
        <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Status</span>
            <Badge variant="outline" className="capitalize mt-1 w-fit">{order.status}</Badge>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider text-right">Date</span>
            <span className="text-sm font-medium mt-1">{format(new Date(order.order_date), "MMM d, yyyy")}</span>
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShoppingBag className="w-4 h-4" />
            Purchased Items
          </div>
          <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
            {items.length > 0 ? items.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between text-sm py-1 border-b border-muted/50 last:border-0 italic">
                <span>{item.quantity}x {item.name}</span>
                <span className="font-medium font-mono text-xs">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground italic">No detailed item information available.</p>
            )}
          </div>
          <div className="flex justify-between pt-2">
            <span className="text-base font-bold">Total Paid</span>
            <span className="text-base font-bold text-primary">{formattedTotal}</span>
          </div>
        </div>

        <Separator />

        {/* Shipping and Payment */}
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Truck className="w-4 h-4" />
              Delivery Address
            </div>
            <p className="text-sm text-muted-foreground bg-muted/20 p-2 rounded border border-muted/50">
              {order.shipping_address || "No address provided."}
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CreditCard className="w-4 h-4" />
              Payment Details
            </div>
            <p className="text-xs text-muted-foreground uppercase opacity-70">
              {order.payment_method.replace("_", " ")}
            </p>
          </div>
        </div>
      </div>
    </DialogContent>
  )
}

export const columns: ColumnDef<Order>[] = [
  {
    accessorKey: "order_id",
    header: "Order ID",
    cell: ({ row }) => {
      const order = row.original
      return (
        <Dialog>
          <DialogTrigger
            className="font-mono text-primary font-bold hover:underline underline-offset-4 text-sm transition-all focus:outline-none"
          >
            #{order.order_id}
          </DialogTrigger>
          <OrderDetails order={order} />
        </Dialog>
      )
    }
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
    accessorKey: "items_json",
    header: "Purchases",
    cell: ({ row }) => {
      const itemsRaw = row.getValue("items_json") as string
      if (!itemsRaw) return <span className="text-xs text-muted-foreground italic">Legacy Order</span>
      
      try {
        const items = JSON.parse(itemsRaw)
        const summary = items.map((i: any) => `${i.quantity}x ${i.name}`).join(", ")
        return <span className="text-xs truncate block max-w-[200px]" title={summary}>{summary}</span>
      } catch (e) {
        return <span className="text-xs text-muted-foreground">Error parsing items</span>
      }
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
    accessorKey: "shipping_address",
    header: "Delivery",
    cell: ({ row }) => <span className="text-xs max-w-[150px] truncate block">{row.getValue("shipping_address") || "N/A"}</span>
  },
  {
    accessorKey: "payment_method",
    header: "Payment",
    cell: ({ row }) => <span className="text-xs text-muted-foreground uppercase opacity-70">{(row.getValue("payment_method") as string).replace("_", " ")}</span>
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const orderId = row.original.order_id
      const [isDeleting, setIsDeleting] = useState(false)

      const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this order?")) return;
        setIsDeleting(true);
        try {
          await deleteOrderAction(orderId);
        } catch (e: any) {
          alert(e.message || "Failed to delete order");
        } finally {
          setIsDeleting(false);
        }
      }

      return (
        <button 
          onClick={handleDelete} 
          disabled={isDeleting}
          className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-md transition-all disabled:opacity-50"
          title="Delete Order"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )
    }
  }
]
