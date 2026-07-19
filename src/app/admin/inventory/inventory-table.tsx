"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { messages } from "@/lib/i18n";
import { adjustStock } from "@/server/admin/inventory";
import { Modal } from "@/components/ui/modal";
import type { InventoryRow } from "@/server/admin/inventory-data";
import { cn } from "@/lib/utils";

const t = messages.admin;
const ti = t.inventory;

export function InventoryTable({
  rows,
  sort,
  dir,
  currency,
  canEdit,
}: {
  rows: InventoryRow[];
  sort: string | null;
  dir: "asc" | "desc";
  currency: string;
  canEdit: boolean;
}) {
  const [adjusting, setAdjusting] = useState<InventoryRow | null>(null);
  const router = useRouter();

  const columns: ColumnDef<InventoryRow, unknown>[] = [
    {
      id: "product",
      header: () => t.products.productCol,
      cell: ({ row }) => (
        <Link href={`/admin/products/${row.original.productId}`} className="font-bold text-navy hover:underline">
          {row.original.productName}
        </Link>
      ),
    },
    {
      id: "variant",
      enableSorting: false,
      header: () => ti.variantCol,
      cell: ({ row }) => (
        <span className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full border border-line" style={{ backgroundColor: row.original.colorHex }} />
          {row.original.colorName} / {row.original.size}
          {!row.original.isActive && (
            <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-bold text-[#6B7280]">
              {t.common.inactive}
            </span>
          )}
        </span>
      ),
    },
    {
      id: "sku",
      header: () => t.products.skuCol,
      cell: ({ row }) => <span className="text-gray-6">{row.original.sku}</span>,
    },
    {
      id: "price",
      enableSorting: false,
      header: () => t.products.priceCol,
      cell: ({ row }) => `${row.original.price.toLocaleString("en-US")} ${currency}`,
    },
    {
      id: "stock",
      header: () => t.products.stockCol,
      cell: ({ row }) => (
        <span className={cn("font-bold", row.original.stock === 0 ? "text-deal-red" : row.original.isLow ? "text-[#B45309]" : "text-ink")}>
          {row.original.stock}
          {row.original.isLow && (
            <span className="ms-2 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold text-[#92400E]">
              {ti.lowBadge}
            </span>
          )}
        </span>
      ),
    },
    {
      id: "lowStockAt",
      enableSorting: false,
      header: () => ti.threshold,
      cell: ({ row }) => <span className="text-gray-4">{row.original.lowStockAt}</span>,
    },
    ...(canEdit
      ? [
          {
            id: "actions",
            enableSorting: false,
            header: () => t.table.actions,
            cell: ({ row }) => (
              <button
                type="button"
                onClick={() => setAdjusting(row.original)}
                className="rounded-full border border-line px-3.5 py-1.5 text-xs font-bold uppercase hover:border-navy"
              >
                {ti.adjust}
              </button>
            ),
          } satisfies ColumnDef<InventoryRow, unknown>,
        ]
      : []),
  ];

  return (
    <>
      <DataTable columns={columns} rows={rows} sort={sort} dir={dir} getRowId={(r) => r.variantId} />
      {adjusting && (
        <AdjustModal
          row={adjusting}
          onClose={() => setAdjusting(null)}
          onDone={() => {
            setAdjusting(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function AdjustModal({ row, onClose, onDone }: { row: InventoryRow; onClose: () => void; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newStock, setNewStock] = useState(String(row.stock));
  const [reason, setReason] = useState("");

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await adjustStock({ variantId: row.variantId, newStock: Number(newStock), reason });
      if (result.ok) onDone();
      else setError(result.error);
    });
  };

  return (
    <Modal open onClose={onClose} title={`${ti.adjustStock} — ${row.sku}`} className="max-w-md">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-6">
          {row.productName} — {row.colorName} / {row.size}
          <span className="ms-2 font-bold text-ink">
            ({ti.currentStock}: {row.stock})
          </span>
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-bold uppercase tracking-[0.5px] text-gray-6">{ti.newStock}</span>
          <input
            type="number"
            min={0}
            value={newStock}
            onChange={(e) => setNewStock(e.target.value)}
            className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-navy"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-bold uppercase tracking-[0.5px] text-gray-6">{ti.reason}</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder={ti.reasonPlaceholder}
            className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none placeholder:text-gray-4 focus:border-navy"
          />
        </label>
        {error && <p className="text-sm font-bold text-deal-red">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={pending || reason.trim().length < 3 || newStock === ""}
            className="h-11 rounded-full bg-navy px-7 text-sm font-extrabold uppercase tracking-[0.5px] text-white hover:bg-navy-deep disabled:opacity-50"
          >
            {pending ? t.common.saving : t.common.save}
          </button>
          <button type="button" onClick={onClose} className="text-sm font-bold text-gray-6 hover:text-navy">
            {t.common.cancel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
