import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { csvResponse, toCsv } from "@/lib/admin/csv";
import { audit } from "@/lib/admin/audit";
import { toNumber } from "@/lib/format";
import { customersForExport } from "@/server/admin/customers-data";

export async function GET(request: Request): Promise<Response> {
  const session = await auth();
  if (!can(session?.user?.role, "customers", "view")) return new Response("Forbidden", { status: 403 });

  const raw = Object.fromEntries(new URL(request.url).searchParams.entries());
  const customers = await customersForExport(raw);
  const csv = toCsv(customers, [
    { header: "name", value: (c) => c.user.name },
    { header: "email", value: (c) => c.user.email },
    { header: "phone", value: (c) => c.user.phone ?? "" },
    { header: "active", value: (c) => (c.user.isActive ? "yes" : "no") },
    { header: "joined", value: (c) => c.user.createdAt },
    { header: "orders", value: (c) => c.stats?._count._all ?? 0 },
    { header: "lifetimeValue", value: (c) => (c.stats?._sum.grandTotal ? toNumber(c.stats._sum.grandTotal) : 0) },
    { header: "lastOrder", value: (c) => c.stats?._max.createdAt ?? "" },
  ]);
  await audit(session?.user?.id, "customers.export", "User", "*", { count: customers.length });
  return csvResponse(csv, "customers.csv");
}
