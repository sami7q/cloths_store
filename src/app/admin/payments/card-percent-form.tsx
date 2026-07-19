"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { messages } from "@/lib/i18n";
import { saveCardPercent } from "@/server/admin/payments";

const t = messages.admin;

export function CardPercentForm({ percent, canEdit }: { percent: number; canEdit: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [value, setValue] = useState(String(percent));

  const save = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await saveCardPercent({ percentOff: Number(value) || 0 });
      setFeedback(result.ok ? result.message : result.error);
      router.refresh();
    });
  };

  return (
    <div>
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-bold uppercase tracking-[0.5px] text-gray-6">
          {t.paymentsAdmin.cardPercentLabel}
        </span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={90}
            value={value}
            disabled={!canEdit}
            onChange={(e) => setValue(e.target.value)}
            className="h-10 w-28 rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-navy"
          />
          <span className="text-sm font-bold text-gray-6">%</span>
        </div>
      </label>
      <p className="mt-1.5 text-xs text-gray-4">{t.paymentsAdmin.cardPercentHint}</p>
      {canEdit && (
        <div className="mt-3 flex items-center gap-3">
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
    </div>
  );
}
