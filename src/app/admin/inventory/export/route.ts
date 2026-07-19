import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { csvResponse, toCsv } from "@/lib/admin/csv";
import { audit } from "@/lib/admin/audit";
import { toNumber } from "@/lib/format";
import { inventoryForExport } from "@/server/admin/inventory-data";

export async function GET(request: Request): Promise<Response> {
  const session = await auth();
  if (!can(session?.user?.role, "inventory", "view")) return new Response("Forbidden", { status: 403 });

  const raw = Object.fromEntries(new URL(request.url).searchParams.entries());
  const variants = await inventoryForExport(raw);
  const csv = toCsv(variants, [
    { header: "variantSku", value: (v) => v.sku },
    { header: "productSku", value: (v) => v.product.sku },
    { header: "productName", value: (v) => v.product.name },
    { header: "color", value: (v) => v.colorName },
    { header: "size", value: (v) => v.size },
    { header: "price", value: (v) => toNumber((v.price ?? v.product.basePrice) as never) },
    { header: "stock", value: (v) => v.stock },
    { header: "lowStockAt", value: (v) => v.lowStockAt },
    { header: "active", value: (v) => (v.isActive ? "yes" : "no") },
  ]);
  await audit(session?.user?.id, "inventory.export", "Variant", "*", { count: variants.length });
  return csvResponse(csv, "inventory.csv");
}
