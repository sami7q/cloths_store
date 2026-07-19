"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { messages } from "@/lib/i18n";
import { deletePage, savePage } from "@/server/admin/content";
import { AdminIcons } from "@/components/admin/icons";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

const t = messages.admin;
const tc = t.content;

export type PageItem = {
  id: string;
  slug: string;
  title: string;
  titleAr: string;
  contentRich: string;
  contentRichAr: string;
  isActive: boolean;
};

const input =
  "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none placeholder:text-gray-4 focus:border-navy";

export function PagesClient({ items, canEdit }: { items: PageItem[]; canEdit: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<PageItem | "new" | null>(null);

  const remove = (item: PageItem) => {
    const formData = new FormData();
    formData.set("id", item.id);
    startTransition(async () => {
      await deletePage(formData);
      router.refresh();
    });
  };

  return (
    <div>
      {canEdit && (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="mb-4 inline-flex h-10 items-center gap-2 rounded-full bg-navy px-5 text-sm font-bold uppercase tracking-[0.5px] text-white hover:bg-navy-deep"
        >
          <AdminIcons.plus width={15} height={15} /> {tc.addPage}
        </button>
      )}
      <ul className="flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">
                {item.title} <span className="ms-1 font-normal text-gray-4">{item.titleAr}</span>
              </p>
              <p className="text-xs text-gray-4">/pages/{item.slug}</p>
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
                  className="grid h-8 w-8 place-items-center rounded-lg text-gray-4 hover:bg-card hover:text-deal-red disabled:opacity-40"
                >
                  <AdminIcons.trash width={15} height={15} />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      <PageModal
        key={editing === null ? "closed" : editing === "new" ? "new" : editing.id}
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function PageModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: PageItem | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const item = editing === "new" ? null : editing;
  const [contentEn, setContentEn] = useState(item?.contentRich ?? "");
  const [contentAr, setContentAr] = useState(item?.contentRichAr ?? "");

  if (editing === null) return null;

  const submit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await savePage(formData);
      if (result.ok) onSaved();
      else setError(result.error);
    });
  };

  return (
    <Modal open onClose={onClose} title={item ? tc.editPage : tc.addPage} className="max-w-3xl">
      <form action={submit} className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto pe-1">
        {item && <input type="hidden" name="id" value={item.id} />}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label={tc.pageTitle}>
            <input name="title" required defaultValue={item?.title ?? ""} className={input} />
          </Field>
          <Field label={tc.pageTitleAr}>
            <input name="titleAr" required defaultValue={item?.titleAr ?? ""} dir="rtl" className={input} />
          </Field>
          <Field label={t.common.slug}>
            <input name="slug" required defaultValue={item?.slug ?? ""} className={input} />
          </Field>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-4">{tc.contentHint}</p>
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase",
              preview ? "border-navy bg-navy text-white" : "border-line hover:border-navy",
            )}
          >
            {tc.preview}
          </button>
        </div>

        {preview ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div
              className="prose-sm min-h-[200px] rounded-xl border border-line bg-card/40 p-4 [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-bold [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:ps-5"
              dangerouslySetInnerHTML={{ __html: contentEn }}
            />
            <div
              dir="rtl"
              className="prose-sm min-h-[200px] rounded-xl border border-line bg-card/40 p-4 [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-bold [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:ps-5"
              dangerouslySetInnerHTML={{ __html: contentAr }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Field label={tc.contentHtml}>
              <textarea
                name="contentRich"
                required
                rows={12}
                value={contentEn}
                onChange={(e) => setContentEn(e.target.value)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2.5 font-mono text-xs outline-none focus:border-navy"
              />
            </Field>
            <Field label={tc.contentHtmlAr}>
              <textarea
                name="contentRichAr"
                required
                rows={12}
                dir="rtl"
                value={contentAr}
                onChange={(e) => setContentAr(e.target.value)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2.5 font-mono text-xs outline-none focus:border-navy"
              />
            </Field>
          </div>
        )}
        {/* Keep values submitted even in preview mode */}
        {preview && (
          <>
            <input type="hidden" name="contentRich" value={contentEn} />
            <input type="hidden" name="contentRichAr" value={contentAr} />
          </>
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
