"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { messages } from "@/lib/i18n";
import { deleteZone, saveCodSettings, saveZone } from "@/server/admin/shipping";
import { AdminIcons } from "@/components/admin/icons";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

const t = messages.admin;
const ts = t.shippingAdmin;

export type ZoneItem = {
  id: string;
  name: string;
  countries: string[];
  cities: string[];
  rate: number;
  freeOver: number | null;
  etaText: string;
  isActive: boolean;
};

const input =
  "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none placeholder:text-gray-4 focus:border-navy";

export function ShippingClient({
  zones,
  currency,
  codEnabled,
  codFee,
  canEdit,
  codVia,
}: {
  zones: ZoneItem[];
  currency: string;
  codEnabled: boolean;
  codFee: number;
  canEdit: boolean;
  codVia: "shipping" | "payments";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<ZoneItem | "new" | null>(null);

  const remove = (zone: ZoneItem) => {
    const formData = new FormData();
    formData.set("id", zone.id);
    startTransition(async () => {
      await deleteZone(formData);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <section>
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="mb-4 inline-flex h-10 items-center gap-2 rounded-full bg-navy px-5 text-sm font-bold uppercase tracking-[0.5px] text-white hover:bg-navy-deep"
          >
            <AdminIcons.plus width={15} height={15} /> {ts.addZone}
          </button>
        )}
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {zones.map((zone) => (
            <li key={zone.id} className="rounded-2xl border border-line bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-heading text-[15px] font-bold uppercase tracking-[0.5px] text-ink">{zone.name}</p>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-bold",
                    zone.isActive ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#F3F4F6] text-[#6B7280]",
                  )}
                >
                  {zone.isActive ? t.common.active : t.common.inactive}
                </span>
              </div>
              <dl className="mt-3 flex flex-col gap-1.5 text-sm">
                <Row label={ts.rate} value={`${zone.rate.toLocaleString("en-US")} ${currency}`} />
                <Row
                  label={ts.freeOver}
                  value={zone.freeOver != null ? `${zone.freeOver.toLocaleString("en-US")} ${currency}` : "—"}
                />
                <Row label={ts.etaText} value={zone.etaText} />
                <Row
                  label={ts.cities}
                  value={zone.cities.length ? zone.cities.join(", ") : `(${ts.catchAll})`}
                />
              </dl>
              {canEdit && (
                <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
                  <button type="button" onClick={() => setEditing(zone)} className="text-sm font-bold text-navy hover:underline">
                    {t.common.edit}
                  </button>
                  <button
                    type="button"
                    disabled={pending || zones.length <= 1}
                    onClick={() => remove(zone)}
                    aria-label={t.common.delete}
                    className="grid h-8 w-8 place-items-center rounded-lg text-gray-4 hover:bg-card hover:text-deal-red disabled:opacity-40"
                  >
                    <AdminIcons.trash width={15} height={15} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <CodSettingsCard codEnabled={codEnabled} codFee={codFee} currency={currency} canEdit={canEdit} via={codVia} />

      <ZoneModal
        key={editing === null ? "closed" : editing === "new" ? "new" : editing.id}
        editing={editing}
        currency={currency}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />
    </div>
  );
}

export function CodSettingsCard({
  codEnabled,
  codFee,
  currency,
  canEdit,
  via,
}: {
  codEnabled: boolean;
  codFee: number;
  currency: string;
  canEdit: boolean;
  via: "shipping" | "payments";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(codEnabled);
  const [fee, setFee] = useState(String(codFee));

  const save = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await saveCodSettings({ codEnabled: enabled, codFee: Number(fee) || 0 }, via);
      setFeedback(result.ok ? result.message : result.error);
      router.refresh();
    });
  };

  return (
    <section className="max-w-[480px] rounded-2xl border border-line bg-white p-5">
      <h2 className="mb-3 font-heading text-[15px] font-bold uppercase tracking-[0.5px]">{ts.codTitle}</h2>
      <label className="flex items-center gap-2 text-sm font-bold text-ink">
        <input
          type="checkbox"
          checked={enabled}
          disabled={!canEdit}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 accent-navy"
        />
        {ts.codEnabled}
      </label>
      <label className="mt-3 flex flex-col gap-1.5">
        <span className="text-[12px] font-bold uppercase tracking-[0.5px] text-gray-6">
          {ts.codFee} ({currency})
        </span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={fee}
          disabled={!canEdit}
          onChange={(e) => setFee(e.target.value)}
          className={`${input} w-36`}
        />
      </label>
      {canEdit && (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="h-10 rounded-full bg-navy px-5 text-sm font-bold uppercase tracking-[0.5px] text-white hover:bg-navy-deep disabled:opacity-50"
          >
            {pending ? t.common.saving : t.common.save}
          </button>
          {feedback && <p className="text-sm font-bold text-gray-6">{feedback}</p>}
        </div>
      )}
    </section>
  );
}

function ZoneModal({
  editing,
  currency,
  onClose,
  onSaved,
}: {
  editing: ZoneItem | "new" | null;
  currency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const zone = editing === "new" ? null : editing;

  if (editing === null) return null;

  const submit = (formData: FormData) => {
    setError(null);
    const num = (key: string) => {
      const v = String(formData.get(key) ?? "").trim();
      return v === "" ? null : Number(v);
    };
    startTransition(async () => {
      const result = await saveZone({
        id: zone?.id,
        name: String(formData.get("name") ?? ""),
        countries: String(formData.get("countries") ?? ""),
        cities: String(formData.get("cities") ?? ""),
        rate: num("rate") ?? 0,
        freeOver: num("freeOver"),
        etaText: String(formData.get("etaText") ?? ""),
        isActive: formData.get("isActive") === "on",
      });
      if (result.ok) onSaved();
      else setError(result.error);
    });
  };

  return (
    <Modal open onClose={onClose} title={zone ? ts.editZone : ts.addZone} className="max-w-xl">
      <form action={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={ts.zoneName}>
            <input name="name" required defaultValue={zone?.name ?? ""} className={input} />
          </Field>
          <Field label={ts.etaText}>
            <input name="etaText" required defaultValue={zone?.etaText ?? ""} className={input} />
          </Field>
          <Field label={`${ts.rate} (${currency})`}>
            <input name="rate" type="number" min={0} step="0.01" required defaultValue={zone?.rate ?? ""} className={input} />
          </Field>
          <Field label={`${ts.freeOver} (${currency})`}>
            <input name="freeOver" type="number" min={0} step="0.01" defaultValue={zone?.freeOver ?? ""} className={input} />
          </Field>
        </div>
        <Field label={ts.countries} hint={ts.countriesHint}>
          <input name="countries" defaultValue={zone?.countries.join(", ") ?? ""} className={input} />
        </Field>
        <Field label={ts.cities} hint={ts.citiesHint}>
          <textarea
            name="cities"
            rows={3}
            defaultValue={zone?.cities.join(", ") ?? ""}
            className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-navy"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm font-bold text-ink">
          <input type="checkbox" name="isActive" defaultChecked={zone?.isActive ?? true} className="h-4 w-4 accent-navy" />
          {t.common.active}
        </label>
        {error && <p className="text-sm font-bold text-deal-red">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="h-11 rounded-full bg-navy px-7 text-sm font-extrabold uppercase tracking-[0.5px] text-white hover:bg-navy-deep disabled:opacity-50"
          >
            {pending ? t.common.saving : t.common.save}
          </button>
          <button type="button" onClick={onClose} className="text-sm font-bold text-gray-6 hover:text-navy">
            {t.common.cancel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-bold uppercase tracking-[0.5px] text-gray-6">{label}</span>
      {children}
      {hint && <span className="text-xs text-gray-4">{hint}</span>}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-gray-4">{label}</dt>
      <dd className="text-end font-bold text-ink">{value}</dd>
    </div>
  );
}
