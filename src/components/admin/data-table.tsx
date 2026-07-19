"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { messages } from "@/lib/i18n";

/**
 * TanStack Table v8 in fully manual mode (§2 stack): rows arrive
 * server-paginated/sorted; header clicks just rewrite the URL, selection is
 * local and feeds the optional bulk-action bar.
 */

type Props<T> = {
  columns: ColumnDef<T, unknown>[];
  rows: T[];
  sort?: string | null;
  dir?: "asc" | "desc";
  getRowId?: (row: T) => string;
  /** Renders below the header when rows are selected; receives selected ids. */
  bulkBar?: (selectedIds: string[], clear: () => void) => React.ReactNode;
  onRowHref?: (row: T) => string;
};

export function DataTable<T>({ columns, rows, sort, dir, getRowId, bulkBar, onRowHref }: Props<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const allColumns = useMemo<ColumnDef<T, unknown>[]>(() => {
    if (!bulkBar) return columns;
    const select: ColumnDef<T, unknown> = {
      id: "_select",
      enableSorting: false,
      header: ({ table }) => (
        <input
          type="checkbox"
          aria-label="select all"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          className="h-4 w-4 accent-navy"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          aria-label="select row"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 accent-navy"
        />
      ),
    };
    return [select, ...columns];
  }, [columns, bulkBar]);

  const table = useReactTable({
    data: rows,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    enableRowSelection: Boolean(bulkBar),
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
  });

  const setSort = (columnId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sort === columnId && dir === "desc") params.set("dir", "asc");
    else if (sort === columnId && dir === "asc") {
      params.delete("sort");
      params.delete("dir");
    } else {
      params.set("sort", columnId);
      params.set("dir", "desc");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      {bulkBar && selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-card px-4 py-2.5">
          <span className="text-sm font-bold text-ink">
            {selectedIds.length} {messages.admin.table.selected}
          </span>
          {bulkBar(selectedIds, () => setRowSelection({}))}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-line bg-card/60">
                {hg.headers.map((header) => {
                  const canSort = header.column.columnDef.enableSorting !== false && header.column.id !== "_select";
                  const active = sort === header.column.id;
                  return (
                    <th key={header.id} className="px-4 py-3 text-start font-bold uppercase tracking-[0.5px] text-[11.5px] text-gray-6">
                      {canSort ? (
                        <button
                          type="button"
                          onClick={() => setSort(header.column.id)}
                          className={cn("inline-flex items-center gap-1 uppercase hover:text-navy", active && "text-navy")}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <span className="text-[9px]">{active ? (dir === "asc" ? "▲" : "▼") : ""}</span>
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={allColumns.length} className="px-4 py-10 text-center text-gray-4">
                  {messages.admin.table.empty}
                </td>
              </tr>
            )}
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowHref ? () => router.push(onRowHref(row.original)) : undefined}
                className={cn("border-b border-line last:border-0", onRowHref && "cursor-pointer hover:bg-card/70")}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
