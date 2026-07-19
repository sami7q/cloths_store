import { requireAdminModule } from "@/lib/auth-guards";
import { messages } from "@/lib/i18n";
import { getManualOrderContext } from "@/server/admin/orders-data";
import { PageHeader } from "@/components/admin/list-controls";
import { ManualOrderForm } from "./manual-order-form";

const t = messages.admin;
export const metadata = { title: `${t.orders.manualOrderTitle} — ${t.title}` };

export default async function NewOrderPage() {
  await requireAdminModule("orders", "edit");
  const ctx = await getManualOrderContext();
  return (
    <div>
      <PageHeader title={t.orders.manualOrderTitle} />
      <ManualOrderForm
        customers={ctx.customers}
        products={ctx.products}
        cities={ctx.cities}
        codEnabled={ctx.codEnabled}
        currency={ctx.currency}
      />
    </div>
  );
}
