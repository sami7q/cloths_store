"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { AdminSelect, StatusPill } from "@/components/admin/list-controls";
import { messages } from "@/lib/i18n";
import { PRODUCT_STATUSES } from "@/lib/enums";
import { bulkUpdateProducts, importProductsCsv } from "@/server/admin/products";
import type { ProductRow } from "@/server/admin/products-data";

const t = messages.admin;

const columns: ColumnDef<ProductRow, unknown>[] = [
  {
    id: "image",
    enableSorting: false,
    header: () => "",
    cell: ({ row }) =>
      row.original.imageUrl ? (
        <Image
          src={row.original.imageUrl}
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 rounded-lg border border-line object-cover"
        />
      ) : (
        <span className="block h-11 w-11 rounded-lg border border-line bg-card" />
      ),
  },
  {
    id: "name",
    header: () => t.products.productCol,
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-bold text-ink">
          {row.original.name}
          {row.original.isFeatured && <span className="ms-2 text-[11px] font-bold uppercase text-navy">★ {t.common.featured}</span>}
        </p>
        <p className="truncate text-xs text-gray-4">{row.original.sku}</p>
      </div>
    ),
  },
  {
    id: "category",
    enableSorting: false,
    header: () => t.products.category,
    cell: ({ row }) => <span className="text-gray-6">{row.original.categoryName}</span>,
  },
  {
    id: "basePrice",
    header: () => t.products.priceCol,
    cell: ({ row }) => <span className="font-bold">{row.original.price}</span>,
  },
  {
    id: "stock",
    enableSorting: false,
    header: () => t.products.stockCol,
    cell: ({ row }) => (
      <span className={row.original.stock === 0 ? "font-bold text-deal-red" : "text-ink"}>
        {row.original.stock}
        <span className="ms-1 text-xs text-gray-4">
          ({row.original.variantCount} {t.products.variantsCol})
        </span>
      </span>
    ),
  },
  {
    id: "status",
    header: () => t.common.status,
    cell: ({ row }) => <StatusPill status={row.original.status} />,
  },
  {
    id: "updatedAt",
    header: () => t.products.updatedCol,
    cell: ({ row }) => <span className="whitespace-nowrap text-gray-6">{row.original.updatedAt}</span>,
  },
];

export function ProductsTable({
  rows,
  sort,
  dir,
  canEdit,
}: {
  rows: ProductRow[];
  sort: string | null;
  dir: "asc" | "desc";
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const statusRef = useRef<HTMLSelectElement>(null);
  const percentRef = useRef<HTMLInputElement>(null);
  const statuses = t.statuses as Record<string, string>;

  const runBulk = (ids: string[], clear: () => void, action: Parameters<typeof bulkUpdateProducts>[0]) => {
    startTransition(async () => {
      const result = await bulkUpdateProducts(action);
      setFeedback(result.ok ? t.common.saved : result.error);
      if (result.ok) clear();
    });
  };

  return (
    <DataTable
      columns={columns}
      rows={rows}
      sort={sort}
      dir={dir}
      getRowId={(r) => r.id}
      onRowHref={(r) => `/admin/products/${r.id}`}
      bulkBar={
        canEdit
          ? (ids, clear) => (
              <div className="flex flex-wrap items-center gap-2">
                <AdminSelect ref={statusRef} defaultValue="" aria-label={t.products.bulkSetStatus} className="h-9">
                  <option value="" disabled>
                    {t.products.bulkSetStatus}
                  </option>
                  {PRODUCT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statuses[s]}
                    </option>
                  ))}
                </AdminSelect>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    const status = statusRef.current?.value;
                    if (status)
                      runBulk(ids, clear, { ids, action: { kind: "status", status: status as (typeof PRODUCT_STATUSES)[number] } });
                  }}
                  className="h-9 rounded-full bg-navy px-4 text-xs font-bold uppercase text-white hover:bg-navy-deep disabled:opacity-50"
                >
                  {t.table.apply}
                </button>
                <span className="mx-1 h-5 w-px bg-line" />
                <input
                  ref={percentRef}
                  type="number"
                  min={-90}
                  max={500}
                  placeholder={t.products.bulkPrice}
                  title={t.products.bulkPriceHint}
                  className="h-9 w-[170px] rounded-full border border-line bg-white px-3 text-sm outline-none placeholder:text-gray-4 focus:border-navy"
                />
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    const percent = Number(percentRef.current?.value);
                    if (!Number.isNaN(percent) && percentRef.current?.value !== "")
                      runBulk(ids, clear, { ids, action: { kind: "price", percent } });
                  }}
                  className="h-9 rounded-full bg-navy px-4 text-xs font-bold uppercase text-white hover:bg-navy-deep disabled:opacity-50"
                >
                  {t.table.apply}
                </button>
                {feedback && <span className="text-xs font-bold text-gray-6">{feedback}</span>}
              </div>
            )
          : undefined
      }
    />
  );
}

export function ImportCsvButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const res = await importProductsCsv(formData);
      setResult(
        res.ok
          ? t.products.importResult
              .replace("{created}", String(res.created))
              .replace("{updated}", String(res.updated))
              .replace("{skipped}", String(res.skipped))
          : res.error,
      );
      if (inputRef.current) inputRef.current.value = "";
    });
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={pending}
        title={t.products.csvImportHint}
        onClick={() => inputRef.current?.click()}
        className="inline-flex h-10 items-center rounded-full border border-line bg-white px-5 text-sm font-bold uppercase tracking-[0.5px] hover:border-navy disabled:opacity-50"
      >
        {pending ? t.common.uploading : t.products.csvImport}
      </button>
      {result && <span className="text-xs font-bold text-gray-6">{result}</span>}
    </div>
  );
}
