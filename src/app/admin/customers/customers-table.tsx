"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { messages } from "@/lib/i18n";
import type { CustomerRow } from "@/server/admin/customers-data";
import { cn } from "@/lib/utils";

const t = messages.admin;
const tcu = t.customers;

const columns: ColumnDef<CustomerRow, unknown>[] = [
  {
    id: "name",
    header: () => t.common.customer,
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-bold text-ink">{row.original.name}</p>
        <p className="truncate text-xs text-gray-4">{row.original.email}</p>
      </div>
    ),
  },
  {
    id: "phone",
    enableSorting: false,
    header: () => t.orders.phone,
    cell: ({ row }) => <span className="text-gray-6">{row.original.phone ?? "—"}</span>,
  },
  {
    id: "orders",
    enableSorting: false,
    header: () => tcu.ordersCount,
    cell: ({ row }) => <span className="font-bold">{row.original.ordersCount}</span>,
  },
  {
    id: "ltv",
    enableSorting: false,
    header: () => tcu.lifetimeValue,
    cell: ({ row }) => <span className="font-bold">{row.original.lifetimeValue}</span>,
  },
  {
    id: "lastOrder",
    enableSorting: false,
    header: () => tcu.lastOrder,
    cell: ({ row }) => <span className="whitespace-nowrap text-gray-6">{row.original.lastOrder ?? tcu.never}</span>,
  },
  {
    id: "createdAt",
    header: () => tcu.joined,
    cell: ({ row }) => <span className="whitespace-nowrap text-gray-6">{row.original.joined}</span>,
  },
  {
    id: "status",
    enableSorting: false,
    header: () => t.common.status,
    cell: ({ row }) => (
      <span
        className={cn(
          "whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold",
          row.original.isActive ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEE2E2] text-[#991B1B]",
        )}
      >
        {row.original.isActive ? tcu.accountActive : tcu.accountDisabled}
      </span>
    ),
  },
];

export function CustomersTable({ rows, sort, dir }: { rows: CustomerRow[]; sort: string | null; dir: "asc" | "desc" }) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      sort={sort}
      dir={dir}
      getRowId={(r) => r.id}
      onRowHref={(r) => `/admin/customers/${r.id}`}
    />
  );
}
