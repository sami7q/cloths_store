"use client";

import Link from "next/link";
import { messages } from "@/lib/i18n";

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = messages.errorPage;
  return (
    <div className="container-store py-20">
      <div className="mx-auto max-w-[520px] rounded-3xl border border-line bg-white p-10 text-center">
        <h1 className="font-heading text-3xl font-bold uppercase tracking-[1px]">{t.title}</h1>
        <p className="mt-3 text-gray-6">{t.body}</p>
        {error.digest ? (
          <p className="mt-2 text-xs text-gray-4">
            {t.reference}: {error.digest}
          </p>
        ) : null}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-navy px-7 py-3 font-extrabold uppercase tracking-[0.5px] text-white transition-colors hover:bg-navy-deep"
          >
            {t.retry}
          </button>
          <Link
            href="/"
            className="rounded-full border-2 border-navy px-7 py-3 font-extrabold uppercase tracking-[0.5px] text-navy transition-colors hover:bg-navy hover:text-white"
          >
            {t.backHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
