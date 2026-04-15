import { currentUser } from '@clerk/nextjs/server';
import { getCustomerByEmail, getOrdersByCustomerId } from '@/lib/db';
import { redirect } from 'next/navigation';
import { columns } from "./columns"
import { DataTable } from "./data-table"
import { Package } from "lucide-react"

export default async function OrdersPage() {
  const user = await currentUser();

  if (!user) {
    redirect('/sign-in');
  }

  const email = user.emailAddresses[0]?.emailAddress;
  const customer = email ? getCustomerByEmail(email) : undefined;
  const orders = customer ? getOrdersByCustomerId(customer.customer_id) : [];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-6xl">
      <div className="flex flex-col gap-2 mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
        <p className="text-muted-foreground">
          {customer 
            ? `Manage and track your recent orders, ${customer.name}.`
            : "No matching customer profile found for your account."}
        </p>
      </div>

      {!customer && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 text-amber-800 text-sm">
          Please contact support if you believe this is an error. We match your account by email: <span className="font-semibold">{email}</span>
        </div>
      )}

      {orders.length > 0 ? (
        <DataTable columns={columns} data={orders} />
      ) : (
        customer && (
          <div className="flex flex-col items-center justify-center py-20 border rounded-lg bg-muted/10">
            <Package className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-semibold">No orders found</h3>
            <p className="text-muted-foreground text-sm">You haven&apos;t placed any orders yet.</p>
          </div>
        )
      )}
    </div>
  );
}
