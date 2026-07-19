"use client";

import { messages } from "@/lib/i18n";

export default function AuthError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = messages.errorPage;
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <h1 className="font-heading text-2xl font-bold uppercase tracking-[1px]">{t.title}</h1>
      <p className="text-sm text-gray-6">{t.body}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-navy px-7 py-3 font-extrabold uppercase tracking-[0.5px] text-white hover:bg-navy-deep"
      >
        {t.retry}
      </button>
    </div>
  );
}
