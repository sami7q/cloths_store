import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { csvResponse, toCsv } from "@/lib/admin/csv";
import { audit } from "@/lib/admin/audit";
import { getReportsData, parseRange } from "@/server/admin/reports-data";

export async function GET(request: Request): Promise<Response> {
  const session = await auth();
  if (!can(session?.user?.role, "reports", "view")) return new Response("Forbidden", { status: 403 });

  const raw = Object.fromEntries(new URL(request.url).searchParams.entries());
  const range = parseRange(raw);
  const data = await getReportsData(range);
  const report = raw.report ?? "day";

  let csv: string;
  switch (report) {
    case "category":
      csv = toCsv(data.byCategory, [
        { header: "category", value: (r) => r.name },
        { header: "units", value: (r) => r.units },
        { header: "revenue", value: (r) => r.revenue },
        { header: "sharePercent", value: (r) => r.share },
      ]);
      break;
    case "product":
      csv = toCsv(data.byProduct, [
        { header: "product", value: (r) => r.name },
        { header: "sku", value: (r) => r.sku },
        { header: "units", value: (r) => r.units },
        { header: "revenue", value: (r) => r.revenue },
      ]);
      break;
    case "payment":
      csv = toCsv(data.paymentSplit, [
        { header: "method", value: (r) => r.method },
        { header: "orders", value: (r) => r.orders },
        { header: "revenue", value: (r) => r.revenue },
        { header: "sharePercent", value: (r) => r.share },
      ]);
      break;
    case "coupon":
      csv = toCsv(data.coupons, [
        { header: "coupon", value: (r) => r.code },
        { header: "orders", value: (r) => r.orders },
        { header: "discountGiven", value: (r) => r.discount },
        { header: "revenue", value: (r) => r.revenue },
        { header: "avgOrder", value: (r) => r.avgOrder },
      ]);
      break;
    default:
      csv = toCsv(data.byDay, [
        { header: "day", value: (r) => r.day },
        { header: "orders", value: (r) => r.orders },
        { header: "revenue", value: (r) => r.revenue },
      ]);
  }

  await audit(session?.user?.id, "reports.export", "Order", "*", {
    report,
    from: range.fromStr,
    to: range.toStr,
  });
  return csvResponse(csv, `report-${report}-${range.fromStr}-${range.toStr}.csv`);
}
