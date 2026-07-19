import { notFound } from "next/navigation";
import { requireAdminModule } from "@/lib/auth-guards";
import { messages } from "@/lib/i18n";
import { PrintableOrderDoc } from "../printable";

export const metadata = { title: messages.admin.orders.packingSlip };

export default async function PackingSlipPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  await requireAdminModule("orders");
  const { orderNumber } = await params;
  const doc = await PrintableOrderDoc({ orderNumber, kind: "packing" });
  if (!doc) notFound();
  return doc;
}
