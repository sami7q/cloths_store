"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { StatusPill } from "@/components/admin/list-controls";
import { messages } from "@/lib/i18n";
import type { OrderRow } from "@/server/admin/orders-data";

const t = messages.admin;

const columns: ColumnDef<OrderRow, unknown>[] = [
  {
    id: "orderNumber",
    header: () => t.orders.orderCol,
    cell: ({ row }) => <span className="font-bold text-navy">{row.original.orderNumber}</span>,
  },
  {
    id: "customer",
    enableSorting: false,
    header: () => t.common.customer,
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-bold text-ink">{row.original.who}</p>
        <p className="truncate text-xs text-gray-4">{row.original.email}</p>
      </div>
    ),
  },
  {
    id: "items",
    enableSorting: false,
    header: () => t.orders.itemsCol,
    cell: ({ row }) => row.original.itemCount,
  },
  {
    id: "total",
    header: () => t.common.total,
    cell: ({ row }) => <span className="font-bold">{row.original.total}</span>,
  },
  {
    id: "payment",
    enableSorting: false,
    header: () => t.orders.payment,
    cell: ({ row }) => (
      <div className="flex flex-col items-start gap-1">
        <span className="text-xs font-bold text-gray-6">
          {(t.statuses as Record<string, string>)[row.original.paymentMethod] ?? row.original.paymentMethod}
        </span>
        <StatusPill status={row.original.paymentStatus} />
      </div>
    ),
  },
  {
    id: "status",
    header: () => t.common.status,
    cell: ({ row }) => <StatusPill status={row.original.status} />,
  },
  {
    id: "createdAt",
    header: () => t.common.date,
    cell: ({ row }) => <span className="whitespace-nowrap text-gray-6">{row.original.createdAt}</span>,
  },
];

export function OrdersTable({ rows, sort, dir }: { rows: OrderRow[]; sort: string | null; dir: "asc" | "desc" }) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      sort={sort}
      dir={dir}
      getRowId={(r) => r.id}
      onRowHref={(r) => `/admin/orders/${r.orderNumber}`}
    />
  );
}
