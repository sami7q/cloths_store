import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { csvResponse, toCsv } from "@/lib/admin/csv";
import { audit } from "@/lib/admin/audit";
import { toNumber } from "@/lib/format";
import { ordersForExport } from "@/server/admin/orders-data";

export async function GET(request: Request): Promise<Response> {
  const session = await auth();
  if (!can(session?.user?.role, "orders", "view")) return new Response("Forbidden", { status: 403 });

  const raw = Object.fromEntries(new URL(request.url).searchParams.entries());
  const orders = await ordersForExport(raw);
  const csv = toCsv(orders, [
    { header: "orderNumber", value: (o) => o.orderNumber },
    { header: "createdAt", value: (o) => o.createdAt },
    { header: "customer", value: (o) => o.user?.name ?? "" },
    { header: "email", value: (o) => o.user?.email ?? o.guestEmail ?? "" },
    { header: "items", value: (o) => o._count.items },
    { header: "subtotal", value: (o) => toNumber(o.subtotal) },
    { header: "discountTotal", value: (o) => toNumber(o.discountTotal) },
    { header: "shippingTotal", value: (o) => toNumber(o.shippingTotal) },
    { header: "codFee", value: (o) => (o.codFee ? toNumber(o.codFee) : 0) },
    { header: "grandTotal", value: (o) => toNumber(o.grandTotal) },
    { header: "paymentMethod", value: (o) => o.paymentMethod },
    { header: "paymentStatus", value: (o) => o.paymentStatus },
    { header: "status", value: (o) => o.status },
    { header: "couponCode", value: (o) => o.couponCode ?? "" },
    { header: "trackingNumber", value: (o) => o.trackingNumber ?? "" },
  ]);
  await audit(session?.user?.id, "orders.export", "Order", "*", { count: orders.length });
  return csvResponse(csv, "orders.csv");
}
