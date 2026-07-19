"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { messages } from "@/lib/i18n";
import { saveNotificationPrefs } from "@/server/admin/notifications";

const t = messages.admin;
const tn = t.notificationsAdmin;

const EVENTS = ["NEW_ORDER", "LOW_STOCK", "PENDING_REVIEW"] as const;

export function PrefsClient({
  prefs,
  canEdit,
}: {
  prefs: Record<string, boolean>;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [state, setState] = useState<Record<(typeof EVENTS)[number], boolean>>({
    NEW_ORDER: prefs.NEW_ORDER !== false,
    LOW_STOCK: prefs.LOW_STOCK !== false,
    PENDING_REVIEW: prefs.PENDING_REVIEW !== false,
  });

  const save = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await saveNotificationPrefs(state);
      setFeedback(result.ok ? result.message : result.error);
      router.refresh();
    });
  };

  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h2 className="font-heading text-[15px] font-bold uppercase tracking-[0.5px]">{tn.prefsTitle}</h2>
      <p className="mb-3 mt-1 text-xs text-gray-4">{tn.prefsNote}</p>
      <div className="flex flex-col gap-2.5">
        {EVENTS.map((event) => (
          <label key={event} className="flex items-center gap-2 text-sm font-bold text-ink">
            <input
              type="checkbox"
              checked={state[event]}
              disabled={!canEdit}
              onChange={(e) => setState((s) => ({ ...s, [event]: e.target.checked }))}
              className="h-4 w-4 accent-navy"
            />
            {(tn as Record<string, string>)[`event${event}`]}
          </label>
        ))}
      </div>
      {canEdit && (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="h-10 rounded-full bg-navy px-5 text-sm font-bold uppercase tracking-[0.5px] text-white hover:bg-navy-deep disabled:opacity-50"
          >
            {pending ? t.common.saving : t.common.save}
          </button>
          {feedback && <p className="text-sm font-bold text-gray-6">{feedback}</p>}
        </div>
      )}
    </section>
  );
}
