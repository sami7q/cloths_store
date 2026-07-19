"use client";

import { useActionState } from "react";
import { messages } from "@/lib/i18n";
import { ORDER_STATUSES } from "@/lib/enums";
import { updateOrderStatus, saveTracking, saveOrderNotes, type ActionState } from "@/server/admin/orders";
import { AdminSelect } from "@/components/admin/list-controls";

const t = messages.admin;
const initial: ActionState = {};

function Feedback({ state }: { state: ActionState }) {
  if (state.error) return <p className="text-sm font-bold text-deal-red">{state.error}</p>;
  if (state.success) return <p className="text-sm font-bold text-save-green">{state.success}</p>;
  return null;
}

function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 rounded-full bg-navy px-5 text-sm font-bold uppercase tracking-[0.5px] text-white hover:bg-navy-deep disabled:opacity-50"
    >
      {pending ? t.common.saving : label}
    </button>
  );
}

export function StatusForm({ orderId, current }: { orderId: string; current: string }) {
  const [state, action, pending] = useActionState(updateOrderStatus, initial);
  const statuses = t.statuses as Record<string, string>;
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="orderId" value={orderId} />
      <AdminSelect name="toStatus" defaultValue="" required aria-label={t.orders.newStatus} className="w-full">
        <option value="" disabled>
          {t.orders.newStatus}
        </option>
        {ORDER_STATUSES.filter((s) => s !== current).map((s) => (
          <option key={s} value={s}>
            {statuses[s]}
          </option>
        ))}
      </AdminSelect>
      <input
        name="note"
        placeholder={t.orders.noteOptional}
        maxLength={500}
        className="h-10 rounded-full border border-line bg-white px-4 text-sm outline-none placeholder:text-gray-4 focus:border-navy"
      />
      <label className="flex items-center gap-2 text-sm text-gray-6">
        <input type="checkbox" name="notify" className="h-4 w-4 accent-navy" />
        {t.orders.notifyCustomer}
      </label>
      <div className="flex items-center gap-3">
        <SubmitButton label={t.orders.updateStatus} pending={pending} />
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function TrackingForm({ orderId, trackingNumber }: { orderId: string; trackingNumber: string | null }) {
  const [state, action, pending] = useActionState(saveTracking, initial);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="orderId" value={orderId} />
      <input
        name="trackingNumber"
        defaultValue={trackingNumber ?? ""}
        placeholder={t.orders.tracking}
        maxLength={80}
        className="h-10 rounded-full border border-line bg-white px-4 text-sm outline-none placeholder:text-gray-4 focus:border-navy"
      />
      <div className="flex items-center gap-3">
        <SubmitButton label={t.orders.saveTracking} pending={pending} />
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function NotesForm({ orderId, notes }: { orderId: string; notes: string | null }) {
  const [state, action, pending] = useActionState(saveOrderNotes, initial);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="orderId" value={orderId} />
      <textarea
        name="notes"
        defaultValue={notes ?? ""}
        placeholder={t.orders.notesHint}
        rows={3}
        maxLength={2000}
        className="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none placeholder:text-gray-4 focus:border-navy"
      />
      <div className="flex items-center gap-3">
        <SubmitButton label={t.orders.saveNotes} pending={pending} />
        <Feedback state={state} />
      </div>
    </form>
  );
}
