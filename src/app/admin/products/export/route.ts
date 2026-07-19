import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { csvResponse, toCsv } from "@/lib/admin/csv";
import { audit } from "@/lib/admin/audit";
import { toNumber } from "@/lib/format";
import { productsForExport } from "@/server/admin/products-data";

export async function GET(request: Request): Promise<Response> {
  const session = await auth();
  if (!can(session?.user?.role, "products", "view")) return new Response("Forbidden", { status: 403 });

  const raw = Object.fromEntries(new URL(request.url).searchParams.entries());
  const products = await productsForExport(raw);
  // Columns match the import format (§6.3 CSV import & export round-trips).
  const csv = toCsv(products, [
    { header: "sku", value: (p) => p.sku },
    { header: "slug", value: (p) => p.slug },
    { header: "name", value: (p) => p.name },
    { header: "nameAr", value: (p) => p.nameAr },
    { header: "description", value: (p) => p.description },
    { header: "descriptionAr", value: (p) => p.descriptionAr },
    { header: "categorySlug", value: (p) => p.category.slug },
    { header: "basePrice", value: (p) => toNumber(p.basePrice) },
    { header: "compareAtPrice", value: (p) => (p.compareAtPrice ? toNumber(p.compareAtPrice) : "") },
    { header: "cardPrice", value: (p) => (p.cardPrice ? toNumber(p.cardPrice) : "") },
    { header: "costPrice", value: (p) => (p.costPrice ? toNumber(p.costPrice) : "") },
    { header: "material", value: (p) => p.material ?? "" },
    { header: "brand", value: (p) => p.brand ?? "" },
    { header: "tags", value: (p) => ((p.tags as string[]) ?? []).join(",") },
    { header: "status", value: (p) => p.status },
    { header: "totalStock", value: (p) => p.variants.reduce((s, v) => s + v.stock, 0) },
  ]);
  await audit(session?.user?.id, "products.export", "Product", "*", { count: products.length });
  return csvResponse(csv, "products.csv");
}
