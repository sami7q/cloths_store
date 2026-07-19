import { notFound } from "next/navigation";
import { requireAdminModule } from "@/lib/auth-guards";
import { messages } from "@/lib/i18n";
import { PrintableOrderDoc } from "../printable";

export const metadata = { title: messages.admin.orders.invoice };

export default async function InvoicePage({ params }: { params: Promise<{ orderNumber: string }> }) {
  await requireAdminModule("orders");
  const { orderNumber } = await params;
  const doc = await PrintableOrderDoc({ orderNumber, kind: "invoice" });
  if (!doc) notFound();
  return doc;
}
