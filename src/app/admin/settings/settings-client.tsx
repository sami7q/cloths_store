"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { messages } from "@/lib/i18n";
import {
  saveIdentity,
  saveLocale,
  saveMaintenance,
  saveSeoDefaults,
  sendSmtpTest,
  type SettingsResult,
} from "@/server/admin/settings";
import { AdminSelect } from "@/components/admin/list-controls";

const t = messages.admin;
const ts = t.settings;

const input =
  "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none placeholder:text-gray-4 focus:border-navy";

export type SettingsValues = {
  name: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  hotline: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  currency: string;
  defaultLocale: string;
  seoTitle: string;
  seoDescription: string;
  maintenanceMode: boolean;
  smtpConfigured: boolean;
};

function useFeedback() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<SettingsResult | null>(null);
  const run = (fn: () => Promise<SettingsResult>) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await fn();
      setFeedback(result);
      if (result.ok) router.refresh();
    });
  };
  return { pending, feedback, run };
}

function Feedback({ state }: { state: SettingsResult | null }) {
  if (!state) return null;
  return state.ok ? (
    <p className="text-sm font-bold text-save-green">{state.message}</p>
  ) : (
    <p className="text-sm font-bold text-deal-red">{state.error}</p>
  );
}

function SaveButton({ pending, label }: { pending: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 rounded-full bg-navy px-5 text-sm font-bold uppercase tracking-[0.5px] text-white hover:bg-navy-deep disabled:opacity-50"
    >
      {pending ? t.common.saving : (label ?? t.common.save)}
    </button>
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

export function IdentityForm({ values }: { values: SettingsValues }) {
  const { pending, feedback, run } = useFeedback();
  return (
    <form action={(formData) => run(() => saveIdentity(formData))} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={ts.storeName}>
          <input name="name" required defaultValue={values.name} className={input} />
        </Field>
        <Field label={ts.hotline}>
          <input name="hotline" defaultValue={values.hotline} className={input} />
        </Field>
        <Field label={ts.logo}>
          <div className="flex items-center gap-3">
            {values.logoUrl && (
              <Image src={values.logoUrl} alt="" width={40} height={40} className="h-10 w-10 rounded-lg border border-line object-contain" />
            )}
            <input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/avif" className="text-sm" />
          </div>
        </Field>
        <Field label={ts.favicon}>
          <div className="flex items-center gap-3">
            {values.faviconUrl && (
              <Image src={values.faviconUrl} alt="" width={24} height={24} className="h-6 w-6 rounded border border-line object-contain" />
            )}
            <input name="favicon" type="file" accept="image/png,image/svg+xml,image/webp" className="text-sm" />
          </div>
        </Field>
      </div>
      <p className="text-[12px] font-bold uppercase tracking-[0.5px] text-gray-6">{ts.socialsTitle}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input name="facebook" defaultValue={values.facebook} placeholder={ts.facebook} className={input} />
        <input name="instagram" defaultValue={values.instagram} placeholder={ts.instagram} className={input} />
        <input name="tiktok" defaultValue={values.tiktok} placeholder={ts.tiktok} className={input} />
      </div>
      <div className="flex items-center gap-3">
        <SaveButton pending={pending} />
        <Feedback state={feedback} />
      </div>
    </form>
  );
}

export function LocaleForm({ values }: { values: SettingsValues }) {
  const { pending, feedback, run } = useFeedback();
  return (
    <form
      action={(formData) =>
        run(() =>
          saveLocale({
            currency: String(formData.get("currency") ?? ""),
            defaultLocale: String(formData.get("defaultLocale") ?? "en"),
          }),
        )
      }
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label={ts.currency} hint={ts.currencyHint}>
          <input name="currency" required defaultValue={values.currency} maxLength={5} className={`${input} uppercase`} />
        </Field>
        <Field label={ts.defaultLocale}>
          <AdminSelect name="defaultLocale" defaultValue={values.defaultLocale} className="h-10 w-full rounded-lg px-3">
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </AdminSelect>
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <SaveButton pending={pending} />
        <Feedback state={feedback} />
      </div>
    </form>
  );
}

export function SeoForm({ values }: { values: SettingsValues }) {
  const { pending, feedback, run } = useFeedback();
  return (
    <form
      action={(formData) =>
        run(() =>
          saveSeoDefaults({
            title: String(formData.get("title") ?? ""),
            description: String(formData.get("description") ?? ""),
          }),
        )
      }
      className="flex flex-col gap-4"
    >
      <Field label={ts.metaTitle}>
        <input name="title" defaultValue={values.seoTitle} maxLength={160} className={input} />
      </Field>
      <Field label={ts.metaDescription}>
        <textarea
          name="description"
          defaultValue={values.seoDescription}
          rows={3}
          maxLength={320}
          className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-navy"
        />
      </Field>
      <div className="flex items-center gap-3">
        <SaveButton pending={pending} />
        <Feedback state={feedback} />
      </div>
    </form>
  );
}

export function MaintenanceForm({ values }: { values: SettingsValues }) {
  const { pending, feedback, run } = useFeedback();
  const [on, setOn] = useState(values.maintenanceMode);
  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm font-bold text-ink">
        <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} className="h-4 w-4 accent-navy" />
        {ts.maintenanceLabel}
      </label>
      <p className="text-xs text-gray-4">{ts.maintenanceNote}</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => saveMaintenance({ maintenanceMode: on }))}
          className="h-10 rounded-full bg-navy px-5 text-sm font-bold uppercase tracking-[0.5px] text-white hover:bg-navy-deep disabled:opacity-50"
        >
          {pending ? t.common.saving : t.common.save}
        </button>
        <Feedback state={feedback} />
      </div>
    </div>
  );
}

export function SmtpTestForm({ values }: { values: SettingsValues }) {
  const { pending, feedback, run } = useFeedback();
  return (
    <div className="flex flex-col gap-3">
      <p className={`text-sm ${values.smtpConfigured ? "text-save-green" : "text-gray-6"}`}>
        {values.smtpConfigured ? ts.smtpConfigured : ts.smtpMissing}
      </p>
      <form
        action={(formData) => run(() => sendSmtpTest({ to: String(formData.get("to") ?? "") }))}
        className="flex flex-wrap items-center gap-2"
      >
        <input name="to" type="email" required placeholder={ts.smtpTestTo} className={`${input} max-w-[260px]`} />
        <SaveButton pending={pending} label={ts.smtpTestSend} />
      </form>
      <Feedback state={feedback} />
    </div>
  );
}
