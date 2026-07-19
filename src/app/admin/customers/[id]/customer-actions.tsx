"use client";

import { useActionState } from "react";
import { messages } from "@/lib/i18n";
import { saveCustomerNotes, type ActionState } from "@/server/admin/customers";

const t = messages.admin;
const initial: ActionState = {};

export function NotesForm({ customerId, notes }: { customerId: string; notes: string | null }) {
  const [state, action, pending] = useActionState(saveCustomerNotes, initial);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={customerId} />
      <textarea
        name="adminNotes"
        defaultValue={notes ?? ""}
        rows={4}
        maxLength={4000}
        placeholder={t.customers.notesHint}
        className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none placeholder:text-gray-4 focus:border-navy"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-full bg-navy px-5 text-sm font-bold uppercase tracking-[0.5px] text-white hover:bg-navy-deep disabled:opacity-50"
        >
          {pending ? t.common.saving : t.common.save}
        </button>
        {state.success && <p className="text-sm font-bold text-save-green">{state.success}</p>}
        {state.error && <p className="text-sm font-bold text-deal-red">{state.error}</p>}
      </div>
    </form>
  );
}
