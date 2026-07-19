"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { messages } from "@/lib/i18n";
import { deleteCategory, reorderCategories, saveCategory } from "@/server/admin/categories";
import { AdminIcons } from "@/components/admin/icons";
import { AdminSelect } from "@/components/admin/list-controls";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

const t = messages.admin.categories;
const tc = messages.admin.common;

export type CategoryNode = {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  iconSvg: string | null;
  imageUrl: string | null;
  parentId: string | null;
  isActive: boolean;
  productCount: number;
  children: CategoryNode[];
};

const input =
  "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none placeholder:text-gray-4 focus:border-navy";

export function CategoriesClient({ tree, canEdit }: { tree: CategoryNode[]; canEdit: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<CategoryNode | "new" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const flatParents = tree.map((c) => ({ id: c.id, name: c.name }));

  const onDropOn = (target: CategoryNode, siblings: CategoryNode[], parentId: string | null) => {
    if (!dragId || dragId === target.id) return;
    const ids = siblings.map((s) => s.id);
    if (!ids.includes(dragId)) return; // same-level moves only
    const without = ids.filter((id) => id !== dragId);
    const targetIndex = without.indexOf(target.id);
    without.splice(targetIndex, 0, dragId);
    setDragId(null);
    startTransition(async () => {
      await reorderCategories({ parentId, orderedIds: without });
      router.refresh();
    });
  };

  const remove = (node: CategoryNode) => {
    startTransition(async () => {
      const result = await deleteCategory(fd({ id: node.id }));
      setFeedback(result.ok ? result.message : result.error);
      router.refresh();
    });
  };

  const renderRow = (node: CategoryNode, siblings: CategoryNode[], parentId: string | null, depth: number) => (
    <li key={node.id}>
      <div
        draggable={canEdit}
        onDragStart={() => setDragId(node.id)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => onDropOn(node, siblings, parentId)}
        className={cn(
          "flex items-center gap-3 border-b border-line bg-white px-4 py-3",
          dragId === node.id && "opacity-50",
        )}
        style={{ paddingInlineStart: `${16 + depth * 32}px` }}
      >
        {canEdit && (
          <span className="cursor-grab text-gray-4" title={t.dragHint}>
            <AdminIcons.drag width={15} height={15} />
          </span>
        )}
        {node.iconSvg ? (
          <span
            className="[&>svg]:h-6 [&>svg]:w-6 text-navy"
            dangerouslySetInnerHTML={{ __html: node.iconSvg }}
            aria-hidden
          />
        ) : (
          <span className="h-6 w-6 rounded bg-card" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">
            {node.name} <span className="ms-1 font-normal text-gray-4">{node.nameAr}</span>
          </p>
          <p className="text-xs text-gray-4">
            /{node.slug} — {node.productCount} {t.productsCount}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-bold",
            node.isActive ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#F3F4F6] text-[#6B7280]",
          )}
        >
          {node.isActive ? tc.active : tc.inactive}
        </span>
        {canEdit && (
          <>
            <button
              type="button"
              onClick={() => setEditing(node)}
              className="text-sm font-bold text-navy hover:underline"
            >
              {tc.edit}
            </button>
            <button
              type="button"
              disabled={pending || node.productCount > 0 || node.children.length > 0}
              title={
                node.productCount > 0 || node.children.length > 0
                  ? t.deleteBlocked.replace("{count}", String(node.productCount + node.children.length))
                  : tc.delete
              }
              onClick={() => remove(node)}
              className="grid h-8 w-8 place-items-center rounded-lg text-gray-4 hover:bg-card hover:text-deal-red disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={tc.delete}
            >
              <AdminIcons.trash width={15} height={15} />
            </button>
          </>
        )}
      </div>
      {node.children.length > 0 && (
        <ul>{node.children.map((child) => renderRow(child, node.children, node.id, depth + 1))}</ul>
      )}
    </li>
  );

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-navy px-5 text-sm font-bold uppercase tracking-[0.5px] text-white hover:bg-navy-deep"
          >
            <AdminIcons.plus width={15} height={15} /> {t.addCategory}
          </button>
        )}
        <p className="text-xs text-gray-4">{t.dragHint}</p>
        {feedback && <p className="text-sm font-bold text-gray-6">{feedback}</p>}
      </div>

      <ul className="overflow-hidden rounded-2xl border border-line [&>li:last-child>div]:border-b-0">
        {tree.map((node) => renderRow(node, tree, null, 0))}
      </ul>

      <CategoryModal
        key={editing === null ? "closed" : editing === "new" ? "new" : editing.id}
        editing={editing}
        parents={flatParents}
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

function CategoryModal({
  editing,
  parents,
  onClose,
  onSaved,
}: {
  editing: CategoryNode | "new" | null;
  parents: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const node = editing === "new" ? null : editing;
  const [name, setName] = useState(node?.name ?? "");
  const [slug, setSlug] = useState(node?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(node));

  if (editing === null) return null;

  const submit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await saveCategory(formData);
      if (result.ok) onSaved();
      else setError(result.error);
    });
  };

  return (
    <Modal open onClose={onClose} title={node ? t.editCategory : t.addCategory} className="max-w-xl">
      <form action={submit} className="flex flex-col gap-4">
        {node && <input type="hidden" name="id" value={node.id} />}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <input name="nameAr" required defaultValue={node?.nameAr ?? ""} dir="rtl" className={input} />
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
            <span className="text-[12px] font-bold uppercase tracking-[0.5px] text-gray-6">{t.parent}</span>
            <AdminSelect name="parentId" defaultValue={node?.parentId ?? ""} className="h-10 w-full rounded-lg px-3">
              <option value="">{t.rootLevel}</option>
              {parents
                .filter((p) => p.id !== node?.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {t.subcategoryOf} {p.name}
                  </option>
                ))}
            </AdminSelect>
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-bold uppercase tracking-[0.5px] text-gray-6">{t.iconSvg}</span>
          <textarea
            name="iconSvg"
            rows={3}
            defaultValue={node?.iconSvg ?? ""}
            placeholder="<svg …>…</svg>"
            className="w-full rounded-xl border border-line bg-white px-3 py-2.5 font-mono text-xs outline-none placeholder:text-gray-4 focus:border-navy"
          />
          <span className="text-xs text-gray-4">{t.iconHint}</span>
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold uppercase tracking-[0.5px] text-gray-6">{t.uploadSvg}</span>
            <input name="iconFile" type="file" accept=".svg,image/svg+xml" className="text-sm" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold uppercase tracking-[0.5px] text-gray-6">{t.bannerImage}</span>
            <input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/avif" className="text-sm" />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm font-bold text-ink">
          <input type="checkbox" name="isActive" defaultChecked={node?.isActive ?? true} className="h-4 w-4 accent-navy" />
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
