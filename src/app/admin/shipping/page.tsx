import { requireAdminModule } from "@/lib/auth-guards";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { messages } from "@/lib/i18n";
import { toNumber } from "@/lib/format";
import { PageHeader } from "@/components/admin/list-controls";
import { ShippingClient, type ZoneItem } from "./shipping-client";

const t = messages.admin;
export const metadata = { title: `${t.nav.shipping} — ${t.title}` };

export default async function AdminShippingPage() {
  const session = await requireAdminModule("shipping");
  const [zones, settings] = await Promise.all([
    db.shippingZone.findMany({ orderBy: { rate: "asc" } }),
    db.storeSettings.findUnique({ where: { id: 1 } }),
  ]);

  const items: ZoneItem[] = zones.map((z) => ({
    id: z.id,
    name: z.name,
    countries: (z.countries as string[]) ?? [],
    cities: (z.cities as string[]) ?? [],
    rate: toNumber(z.rate),
    freeOver: z.freeOver ? toNumber(z.freeOver) : null,
    etaText: z.etaText,
    isActive: z.isActive,
  }));

  return (
    <div>
      <PageHeader title={t.shippingAdmin.title} />
      <ShippingClient
        zones={items}
        currency={settings?.currency ?? "EGP"}
        codEnabled={settings?.codEnabled ?? true}
        codFee={toNumber(settings?.codFee ?? 0)}
        canEdit={can(session.user.role, "shipping", "edit")}
        codVia="shipping"
      />
    </div>
  );
}
