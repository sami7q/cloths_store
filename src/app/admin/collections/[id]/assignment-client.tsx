"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { messages } from "@/lib/i18n";
import { setCollectionProducts } from "@/server/admin/collections";
import { AdminIcons } from "@/components/admin/icons";

const t = messages.admin.collections;
const tc = messages.admin.common;

export type AssignableProduct = {
  id: string;
  name: string;
  sku: string;
  price: string;
  imageUrl: string | null;
  status: string;
};

export function AssignmentClient({
  collectionId,
  assignedIds,
  catalog,
}: {
  collectionId: string;
  assignedIds: string[];
  catalog: AssignableProduct[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [ids, setIds] = useState<string[]>(assignedIds);
  const [query, setQuery] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const byId = useMemo(() => new Map(catalog.map((p) => [p.id, p])), [catalog]);
  const assigned = ids.map((id) => byId.get(id)).filter((p): p is AssignableProduct => Boolean(p));
  const assignedSet = new Set(ids);
  const candidates = catalog.filter(
    (p) =>
      !assignedSet.has(p.id) &&
      (query.trim() === "" || `${p.name} ${p.sku}`.toLowerCase().includes(query.trim().toLowerCase())),
  );

  const persist = (next: string[]) => {
    setIds(next);
    setSaved(false);
    startTransition(async () => {
      const result = await setCollectionProducts({ collectionId, productIds: next });
      if (result.ok) setSaved(true);
      router.refresh();
    });
  };

  const drop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...ids];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setDragIndex(null);
    persist(next);
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <section className="rounded-2xl border border-line bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-[15px] font-bold uppercase tracking-[0.5px]">
            {t.productsAssigned} ({assigned.length})
          </h2>
          <span className="text-xs font-bold text-gray-4">
            {pending ? tc.saving : saved ? tc.saved : ""}
          </span>
        </div>
        <p className="mb-3 text-xs text-gray-4">{t.assignHint}</p>
        {assigned.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line py-8 text-center text-sm text-gray-4">
            {t.noAssigned}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {assigned.map((product, index) => (
              <li
                key={product.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => drop(index)}
                className="flex items-center gap-3 py-2.5"
              >
                <span className="cursor-grab text-gray-4">
                  <AdminIcons.drag width={15} height={15} />
                </span>
                <span className="w-6 text-center text-xs font-bold text-gray-4">{index + 1}</span>
                <Thumb product={product} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{product.name}</p>
                  <p className="text-xs text-gray-4">
                    {product.sku} — {product.price}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => persist(ids.filter((id) => id !== product.id))}
                  aria-label={tc.remove}
                  className="grid h-8 w-8 place-items-center rounded-lg text-gray-4 hover:bg-card hover:text-deal-red"
                >
                  <AdminIcons.trash width={15} height={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="mb-3 font-heading text-[15px] font-bold uppercase tracking-[0.5px]">{t.addProducts}</h2>
        <div className="relative mb-3">
          <AdminIcons.search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-gray-4" width={15} height={15} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchProducts}
            className="h-10 w-full rounded-full border border-line bg-card ps-9 pe-4 text-sm outline-none placeholder:text-gray-4 focus:border-navy focus:bg-white"
          />
        </div>
        <ul className="flex max-h-[480px] flex-col divide-y divide-line overflow-y-auto">
          {candidates.slice(0, 40).map((product) => (
            <li key={product.id} className="flex items-center gap-3 py-2.5">
              <Thumb product={product} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">{product.name}</p>
                <p className="text-xs text-gray-4">
                  {product.sku} — {product.price}
                </p>
              </div>
              <button
                type="button"
                onClick={() => persist([...ids, product.id])}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-line px-3 text-xs font-bold uppercase hover:border-navy"
              >
                <AdminIcons.plus width={12} height={12} /> {tc.add}
              </button>
            </li>
          ))}
          {candidates.length === 0 && (
            <li className="py-6 text-center text-sm text-gray-4">{messages.admin.shell.noResults}</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function Thumb({ product }: { product: AssignableProduct }) {
  return product.imageUrl ? (
    <Image
      src={product.imageUrl}
      alt=""
      width={40}
      height={40}
      className="h-10 w-10 shrink-0 rounded-lg border border-line object-cover"
    />
  ) : (
    <span className="h-10 w-10 shrink-0 rounded-lg border border-line bg-card" />
  );
}
