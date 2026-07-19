"use client";

import { AdminIcons } from "@/components/admin/icons";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 items-center gap-2 rounded-full bg-navy px-5 text-sm font-bold uppercase tracking-[0.5px] text-white hover:bg-navy-deep print:hidden"
    >
      <AdminIcons.print width={16} height={16} />
      {label}
    </button>
  );
}
