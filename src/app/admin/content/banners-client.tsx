"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { messages } from "@/lib/i18n";
import { deleteBanner, saveBanner } from "@/server/admin/content";
import { AdminIcons } from "@/components/admin/icons";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

const t = messages.admin;
const tc = t.content;

export type BannerItem = {
  id: string;
  placement: string;
  title: string | null;
  titleAr: string | null;
  subtitle: string | null;
  subtitleAr: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  badge: string;
  caption: string;
  startsAt: string;
  endsAt: string;
  sortOrder: number;
  isActive: boolean;
  hasStyle: boolean;
};

export type BannerFields = {
  subtitle?: boolean;
  image?: boolean;
  link?: boolean;
  badge?: boolean;
  caption?: boolean;
  schedule?: boolean;
};

const input =
  "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none placeholder:text-gray-4 focus:border-navy";

export function BannersClient({
  placement,
  items,
  fields,
  hint,
  canEdit,
}: {
  placement: string;
  items: BannerItem[];
  fields: BannerFields;
  hint?: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<BannerItem | "new" | null>(null);

  const remove = (item: BannerItem) => {
    const formData = new FormData();
    formData.set("id", item.id);
    startTransition(async () => {
      await deleteBanner(formData);
      router.refresh();
    });
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-navy px-5 text-sm font-bold uppercase tracking-[0.5px] text-white hover:bg-navy-deep"
          >
            <AdminIcons.plus width={15} height={15} /> {tc.addItem}
          </button>
        )}
        {hint && <p className="text-xs text-gray-4">{hint}</p>}
      </div>

      <ul className="flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-3.5">
            {fields.image &&
              (item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt=""
                  width={64}
                  height={64}
                  className="h-16 w-16 shrink-0 rounded-xl border border-line object-cover"
                />
              ) : (
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-line bg-card text-[10px] font-bold uppercase text-gray-4">
                  {item.hasStyle ? "style" : "—"}
                </span>
              ))}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">
                {item.title || <span className="text-gray-4">—</span>}
                {item.titleAr && <span className="ms-2 font-normal text-gray-4">{item.titleAr}</span>}
              </p>
              {item.subtitle && <p className="truncate text-xs text-gray-4">{item.subtitle}</p>}
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase text-gray-4">
                <span>#{item.sortOrder}</span>
                {item.badge && <span className="rounded-full bg-deal-red/10 px-2 py-0.5 text-deal-red">{item.badge}</span>}
                {(item.startsAt || item.endsAt) && (
                  <span className="rounded-full bg-card px-2 py-0.5">
                    {tc.scheduledBadge}: {item.startsAt || "…"} → {item.endsAt || "…"}
                  </span>
                )}
                {item.linkUrl && <span className="truncate normal-case">{item.linkUrl}</span>}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
                item.isActive ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#F3F4F6] text-[#6B7280]",
              )}
            >
              {item.isActive ? t.common.active : t.common.inactive}
            </span>
            {canEdit && (
              <>
                <button type="button" onClick={() => setEditing(item)} className="text-sm font-bold text-navy hover:underline">
                  {t.common.edit}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(item)}
                  aria-label={t.common.delete}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-4 hover:bg-card hover:text-deal-red disabled:opacity-40"
                >
                  <AdminIcons.trash width={15} height={15} />
                </button>
              </>
            )}
          </li>
        ))}
        {items.length === 0 && (
          <li className="rounded-2xl border border-dashed border-line py-10 text-center text-sm text-gray-4">
            {t.table.empty}
          </li>
        )}
      </ul>

      <BannerModal
        key={editing === null ? "closed" : editing === "new" ? "new" : editing.id}
        editing={editing}
        placement={placement}
        fields={fields}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function BannerModal({
  editing,
  placement,
  fields,
  onClose,
  onSaved,
}: {
  editing: BannerItem | "new" | null;
  placement: string;
  fields: BannerFields;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const item = editing === "new" ? null : editing;

  if (editing === null) return null;

  const submit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await saveBanner(formData);
      if (result.ok) onSaved();
      else setError(result.error);
    });
  };

  return (
    <Modal open onClose={onClose} title={item ? tc.editItem : tc.addItem} className="max-w-xl">
      <form action={submit} className="flex flex-col gap-4">
        {item && <input type="hidden" name="id" value={item.id} />}
        <input type="hidden" name="placement" value={placement} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={tc.headline}>
            <input name="title" defaultValue={item?.title ?? ""} className={input} />
          </Field>
          <Field label={tc.headlineAr}>
            <input name="titleAr" defaultValue={item?.titleAr ?? ""} dir="rtl" className={input} />
          </Field>
          {fields.subtitle && (
            <>
              <Field label={tc.subtitle}>
                <input name="subtitle" defaultValue={item?.subtitle ?? ""} className={input} />
              </Field>
              <Field label={tc.subtitleAr}>
                <input name="subtitleAr" defaultValue={item?.subtitleAr ?? ""} dir="rtl" className={input} />
              </Field>
            </>
          )}
          {fields.link && (
            <Field label={tc.linkUrl}>
              <input name="linkUrl" defaultValue={item?.linkUrl ?? ""} placeholder="/category/…" className={input} />
            </Field>
          )}
          {fields.badge && (
            <Field label={tc.badgeText}>
              <input name="badge" defaultValue={item?.badge ?? ""} className={input} />
            </Field>
          )}
          {fields.caption && (
            <Field label={tc.caption}>
              <input name="caption" defaultValue={item?.caption ?? ""} className={input} />
            </Field>
          )}
          {fields.image && (
            <Field label={tc.image}>
              <input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/avif" className="text-sm" />
            </Field>
          )}
          <Field label={t.common.sortOrder}>
            <input name="sortOrder" type="number" min={0} defaultValue={item?.sortOrder ?? 0} className={input} />
          </Field>
        </div>
        {fields.schedule && (
          <div className="rounded-xl border border-line bg-card/50 p-3">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.5px] text-gray-6">
              {tc.schedule} <span className="font-normal normal-case text-gray-4">— {tc.scheduleHint}</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label={tc.showFrom}>
                <input name="startsAt" type="date" defaultValue={item?.startsAt ?? ""} className={input} />
              </Field>
              <Field label={tc.showUntil}>
                <input name="endsAt" type="date" defaultValue={item?.endsAt ?? ""} className={input} />
              </Field>
            </div>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm font-bold text-ink">
          <input type="checkbox" name="isActive" defaultChecked={item?.isActive ?? true} className="h-4 w-4 accent-navy" />
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-bold uppercase tracking-[0.5px] text-gray-6">{label}</span>
      {children}
    </label>
  );
}
