"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { messages } from "@/lib/i18n";
import { saveVariants } from "@/server/admin/products";
import type { EditorVariant } from "@/server/admin/products-data";
import { AdminIcons } from "@/components/admin/icons";

const t = messages.admin.products;
const tc = messages.admin.common;

type RowState = {
  id?: string;
  colorName: string;
  colorHex: string;
  size: string;
  sku: string;
  price: number | null;
  stock: number;
  lowStockAt: number;
  isActive: boolean;
  hasOrders: boolean;
};

const input =
  "h-9 w-full rounded-lg border border-line bg-white px-2.5 text-sm outline-none placeholder:text-gray-4 focus:border-navy";

export function VariantsMatrix({
  productId,
  baseSku,
  initial,
}: {
  productId: string;
  baseSku: string;
  initial: EditorVariant[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const [rows, setRows] = useState<RowState[]>(initial.map((v) => ({ ...v })));
  const [colors, setColors] = useState<{ name: string; hex: string }[]>(() => {
    const seen = new Map<string, string>();
    for (const v of initial) if (!seen.has(v.colorName)) seen.set(v.colorName, v.colorHex);
    return [...seen.entries()].map(([name, hex]) => ({ name, hex }));
  });
  const [sizesText, setSizesText] = useState(() => [...new Set(initial.map((v) => v.size))].join(", "));
  const [bulkStock, setBulkStock] = useState("");

  const sizes = useMemo(
    () => [...new Set(sizesText.split(",").map((s) => s.trim()).filter(Boolean))],
    [sizesText],
  );

  const setColor = (index: number, patch: Partial<{ name: string; hex: string }>) => {
    setColors((cs) => {
      const prev = cs[index];
      const next = cs.map((c, i) => (i === index ? { ...c, ...patch } : c));
      // Keep existing rows in sync when a color is renamed or re-tinted.
      setRows((rs) =>
        rs.map((r) =>
          r.colorName === prev.name
            ? { ...r, colorName: patch.name ?? r.colorName, colorHex: patch.hex ?? r.colorHex }
            : r,
        ),
      );
      return next;
    });
  };

  const removeColor = (index: number) => {
    const name = colors[index].name;
    setColors((cs) => cs.filter((_, i) => i !== index));
    setRows((rs) => rs.filter((r) => r.colorName !== name));
  };

  const generate = () => {
    setRows((current) => {
      const have = new Set(current.map((r) => `${r.colorName}|${r.size}`));
      const added: RowState[] = [];
      for (const color of colors) {
        if (!color.name.trim()) continue;
        for (const size of sizes) {
          const key = `${color.name}|${size}`;
          if (have.has(key)) continue;
          const colorCode = color.name.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase();
          added.push({
            colorName: color.name,
            colorHex: color.hex,
            size,
            sku: `${baseSku}-${colorCode}-${size}`.toUpperCase(),
            price: null,
            stock: 0,
            lowStockAt: 3,
            isActive: true,
            hasOrders: false,
          });
        }
      }
      return [...current, ...added];
    });
  };

  const setRow = (index: number, patch: Partial<RowState>) =>
    setRows((rs) => rs.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const save = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await saveVariants({
        productId,
        rows: rows.map((r) => ({
          id: r.id,
          colorName: r.colorName,
          colorHex: r.colorHex,
          size: r.size,
          sku: r.sku,
          price: r.price,
          stock: r.stock,
          lowStockAt: r.lowStockAt,
          isActive: r.isActive,
        })),
      });
      if (result.ok) {
        setFeedback({ ok: true, text: result.message });
        router.refresh();
      } else {
        setFeedback({ ok: false, text: result.error });
      }
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-card/50 p-4">
          <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.5px] text-gray-6">{t.colors}</p>
          <div className="flex flex-col gap-2">
            {colors.map((color, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="color"
                  value={color.hex}
                  onChange={(e) => setColor(i, { hex: e.target.value })}
                  aria-label={t.colorHex}
                  className="h-9 w-11 cursor-pointer rounded-lg border border-line bg-white p-1"
                />
                <input
                  value={color.name}
                  onChange={(e) => setColor(i, { name: e.target.value })}
                  placeholder={t.colorName}
                  className={input}
                />
                <button
                  type="button"
                  onClick={() => removeColor(i)}
                  aria-label={tc.remove}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-gray-4 hover:bg-white hover:text-deal-red"
                >
                  <AdminIcons.trash width={15} height={15} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setColors((cs) => [...cs, { name: "", hex: "#333333" }])}
              className="inline-flex items-center gap-1.5 self-start text-sm font-bold text-navy hover:underline"
            >
              <AdminIcons.plus width={14} height={14} /> {t.addColor}
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-card/50 p-4">
          <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.5px] text-gray-6">{t.sizes}</p>
          <input value={sizesText} onChange={(e) => setSizesText(e.target.value)} placeholder={t.sizesHint} className={input} />
          <p className="mt-2 text-xs text-gray-4">{t.matrixHint}</p>
          <button
            type="button"
            onClick={generate}
            className="mt-3 h-10 rounded-full bg-navy px-5 text-sm font-bold uppercase tracking-[0.5px] text-white hover:bg-navy-deep"
          >
            {t.generateMatrix}
          </button>
        </div>
      </div>

      {rows.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-gray-6">{t.bulkStock}</label>
            <input
              type="number"
              min={0}
              value={bulkStock}
              onChange={(e) => setBulkStock(e.target.value)}
              className="h-9 w-24 rounded-lg border border-line bg-white px-2.5 text-sm outline-none focus:border-navy"
            />
            <button
              type="button"
              onClick={() => {
                const n = Number(bulkStock);
                if (!Number.isNaN(n) && bulkStock !== "")
                  setRows((rs) => rs.map((r) => ({ ...r, stock: Math.max(0, Math.trunc(n)) })));
              }}
              className="h-9 rounded-full border border-line bg-white px-4 text-xs font-bold uppercase hover:border-navy"
            >
              {t.applyAll}
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line bg-card/60 text-[11.5px] uppercase tracking-[0.5px] text-gray-6">
                  <th className="px-3 py-2.5 text-start font-bold">{t.colors}</th>
                  <th className="px-3 py-2.5 text-start font-bold">{t.sizes}</th>
                  <th className="px-3 py-2.5 text-start font-bold">{t.skuCol}</th>
                  <th className="px-3 py-2.5 text-start font-bold">{t.priceOverride}</th>
                  <th className="px-3 py-2.5 text-start font-bold">{t.stockCol}</th>
                  <th className="px-3 py-2.5 text-start font-bold">{t.lowStockAt}</th>
                  <th className="px-3 py-2.5 text-start font-bold">{t.rowActive}</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={`${row.colorName}|${row.size}|${i}`} className="border-b border-line last:border-0">
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border border-line" style={{ backgroundColor: row.colorHex }} />
                        <span className="font-bold">{row.colorName}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 font-bold">{row.size}</td>
                    <td className="px-3 py-2">
                      <input value={row.sku} onChange={(e) => setRow(i, { sku: e.target.value })} className={`${input} min-w-[150px]`} />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.price ?? ""}
                        placeholder="—"
                        onChange={(e) => setRow(i, { price: e.target.value === "" ? null : Number(e.target.value) })}
                        className={`${input} w-24`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={row.stock}
                        onChange={(e) => setRow(i, { stock: Math.max(0, Math.trunc(Number(e.target.value) || 0)) })}
                        className={`${input} w-20`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={row.lowStockAt}
                        onChange={(e) => setRow(i, { lowStockAt: Math.max(0, Math.trunc(Number(e.target.value) || 0)) })}
                        className={`${input} w-20`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={row.isActive}
                        onChange={(e) => setRow(i, { isActive: e.target.checked })}
                        aria-label={t.rowActive}
                        className="h-4 w-4 accent-navy"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                        title={row.hasOrders ? t.variantHasOrders : tc.remove}
                        aria-label={tc.remove}
                        className="grid h-8 w-8 place-items-center rounded-lg text-gray-4 hover:bg-card hover:text-deal-red"
                      >
                        <AdminIcons.trash width={15} height={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="h-11 rounded-full bg-navy px-7 text-sm font-extrabold uppercase tracking-[0.5px] text-white hover:bg-navy-deep disabled:opacity-50"
        >
          {pending ? tc.saving : t.saveVariants}
        </button>
        {feedback && (
          <p className={`text-sm font-bold ${feedback.ok ? "text-save-green" : "text-deal-red"}`}>{feedback.text}</p>
        )}
      </div>
    </div>
  );
}
