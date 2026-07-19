"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { messages } from "@/lib/i18n";
import { deleteCollection, saveCollection } from "@/server/admin/collections";
import { AdminIcons } from "@/components/admin/icons";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

const t = messages.admin.collections;
const tc = messages.admin.common;

export type CollectionRow = {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  imageUrl: string | null;
  isActive: boolean;
  productCount: number;
};

const input =
  "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none placeholder:text-gray-4 focus:border-navy";

export function CollectionsClient({ rows, canEdit }: { rows: CollectionRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<CollectionRow | "new" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const remove = (row: CollectionRow) => {
    startTransition(async () => {
      const result = await deleteCollection(fd({ id: row.id }));
      setFeedback(result.ok ? result.message : result.error);
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
            <AdminIcons.plus width={15} height={15} /> {t.addCollection}
          </button>
        )}
        {feedback && <p className="text-sm font-bold text-gray-6">{feedback}</p>}
      </div>

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <li key={row.id} className="flex gap-4 rounded-2xl border border-line bg-white p-4">
            {row.imageUrl ? (
              <Image
                src={row.imageUrl}
                alt=""
                width={72}
                height={72}
                className="h-[72px] w-[72px] shrink-0 rounded-xl border border-line object-cover"
              />
            ) : (
              <span className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-xl border border-line bg-card text-gray-4">
                <AdminIcons.collections />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-[15px] font-bold uppercase tracking-[0.5px] text-ink">
                {row.name}
              </p>
              <p className="truncate text-sm text-gray-4">
                {row.nameAr} — /{row.slug}
              </p>
              <p className="mt-1 text-sm text-gray-6">
                {row.productCount} {t.productCount}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-bold",
                    row.isActive ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#F3F4F6] text-[#6B7280]",
                  )}
                >
                  {row.isActive ? tc.active : tc.inactive}
                </span>
                {canEdit && (
                  <>
                    <Link href={`/admin/collections/${row.id}`} className="text-sm font-bold text-navy hover:underline">
                      {t.manageProducts}
                    </Link>
                    <button type="button" onClick={() => setEditing(row)} className="text-sm font-bold text-gray-6 hover:text-navy">
                      {tc.edit}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(row)}
                      aria-label={tc.delete}
                      className="grid h-8 w-8 place-items-center rounded-lg text-gray-4 hover:bg-card hover:text-deal-red disabled:opacity-40"
                    >
                      <AdminIcons.trash width={15} height={15} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <CollectionModal
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

function fd(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [k, v] of Object.entries(entries)) formData.set(k, v);
  return formData;
}

function CollectionModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: CollectionRow | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const row = editing === "new" ? null : editing;
  const [name, setName] = useState(row?.name ?? "");
  const [slug, setSlug] = useState(row?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(row));

  if (editing === null) return null;

  const submit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await saveCollection(formData);
      if (result.ok) onSaved();
      else setError(result.error);
    });
  };

  return (
    <Modal open onClose={onClose} title={row ? t.editCollection : t.addCollection} className="max-w-lg">
      <form action={submit} className="flex flex-col gap-4">
        {row && <input type="hidden" name="id" value={row.id} />}
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-bold uppercase tracking-[0.5px] text-gray-6">{tc.name}</span>
          <input
            name="name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched)
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
            }}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-bold uppercase tracking-[0.5px] text-gray-6">{tc.nameAr}</span>
          <input name="nameAr" required defaultValue={row?.nameAr ?? ""} dir="rtl" className={input} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-bold uppercase tracking-[0.5px] text-gray-6">{tc.slug}</span>
          <input
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-bold uppercase tracking-[0.5px] text-gray-6">{t.coverImage}</span>
          <input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/avif" className="text-sm" />
        </label>
        <label className="flex items-center gap-2 text-sm font-bold text-ink">
          <input type="checkbox" name="isActive" defaultChecked={row?.isActive ?? true} className="h-4 w-4 accent-navy" />
          {tc.active}
        </label>
        {error && <p className="text-sm font-bold text-deal-red">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="h-11 rounded-full bg-navy px-7 text-sm font-extrabold uppercase tracking-[0.5px] text-white hover:bg-navy-deep disabled:opacity-50"
          >
            {pending ? tc.saving : tc.save}
          </button>
          <button type="button" onClick={onClose} className="text-sm font-bold text-gray-6 hover:text-navy">
            {tc.cancel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
