import { requireAdminModule } from "@/lib/auth-guards";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { messages } from "@/lib/i18n";
import { toNumber } from "@/lib/format";
import { stripeEnabled } from "@/lib/payments/stripe";
import { PageHeader } from "@/components/admin/list-controls";
import { CodSettingsCard } from "../shipping/shipping-client";
import { CardPercentForm } from "./card-percent-form";
import { cn } from "@/lib/utils";

const t = messages.admin;
const tp = t.paymentsAdmin;
export const metadata = { title: `${t.nav.payments} — ${t.title}` };

/** Show enough of an env key to identify it, never the middle. */
function mask(value: string | undefined): string {
  if (!value) return tp.notSet;
  if (value.length <= 12) return "••••";
  return `${value.slice(0, 8)}••••${value.slice(-4)}`;
}

export default async function AdminPaymentsPage() {
  const session = await requireAdminModule("payments");
  const canEdit = can(session.user.role, "payments", "edit");
  const [settings, cardRule] = await Promise.all([
    db.storeSettings.findUnique({ where: { id: 1 } }),
    db.promoRule.findFirst({ where: { type: "CARD_EXTRA_PERCENT" } }),
  ]);
  const stripeOn = stripeEnabled();
  const cardPercent =
    cardRule?.isActive ? (((cardRule.config as { percentOff?: number } | null)?.percentOff as number) ?? 0) : 0;

  return (
    <div>
      <PageHeader title={tp.title} />
      <div className="grid max-w-[980px] grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-heading text-[15px] font-bold uppercase tracking-[0.5px]">{tp.stripeTitle}</h2>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-bold",
                stripeOn ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEF3C7] text-[#92400E]",
              )}
            >
              {stripeOn ? t.common.active : t.common.inactive}
            </span>
          </div>
          <p className="text-sm text-gray-6">{stripeOn ? tp.stripeConfigured : tp.stripeMissing}</p>
          <dl className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
            <KeyRow label={tp.secretKey} value={mask(process.env.STRIPE_SECRET_KEY)} set={Boolean(process.env.STRIPE_SECRET_KEY)} />
            <KeyRow
              label={tp.publishableKey}
              value={mask(process.env.STRIPE_PUBLISHABLE_KEY)}
              set={Boolean(process.env.STRIPE_PUBLISHABLE_KEY)}
            />
            <KeyRow
              label={tp.webhookSecret}
              value={mask(process.env.STRIPE_WEBHOOK_SECRET)}
              set={Boolean(process.env.STRIPE_WEBHOOK_SECRET)}
            />
          </dl>
          <p className="mt-3 text-xs text-gray-4">{tp.envNote}</p>
        </section>

        <div className="flex flex-col gap-4">
          <CodSettingsCard
            codEnabled={settings?.codEnabled ?? true}
            codFee={toNumber(settings?.codFee ?? 0)}
            currency={settings?.currency ?? "EGP"}
            canEdit={canEdit}
            via="payments"
          />
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="mb-3 font-heading text-[15px] font-bold uppercase tracking-[0.5px]">{tp.cardPercentTitle}</h2>
            <CardPercentForm percent={cardPercent} canEdit={canEdit} />
          </section>
        </div>
      </div>
    </div>
  );
}

function KeyRow({ label, value, set }: { label: string; value: string; set: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-gray-4">{label}</dt>
      <dd className={cn("font-mono text-[13px] font-bold", set ? "text-ink" : "text-gray-4")}>{value}</dd>
    </div>
  );
}
