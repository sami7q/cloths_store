"use client";

import Link from "next/link";
import { messages } from "@/lib/i18n";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = messages.errorPage;
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <div className="w-full max-w-[480px] rounded-2xl border border-line bg-white p-8 text-center">
        <h1 className="font-heading text-2xl font-bold uppercase tracking-[1px]">{t.title}</h1>
        <p className="mt-2 text-sm text-gray-6">{t.body}</p>
        {error.digest ? (
          <p className="mt-2 text-xs text-gray-4">
            {t.reference}: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="h-11 rounded-full bg-navy px-6 text-sm font-extrabold uppercase tracking-[0.5px] text-white hover:bg-navy-deep"
          >
            {t.retry}
          </button>
          <Link
            href="/admin"
            className="inline-flex h-11 items-center rounded-full border border-line px-6 text-sm font-bold uppercase tracking-[0.5px] hover:border-navy"
          >
            {t.backAdmin}
          </Link>
        </div>
      </div>
    </div>
  );
}
