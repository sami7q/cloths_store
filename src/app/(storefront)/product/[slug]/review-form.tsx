"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitReview, type ReviewFormState } from "@/server/reviews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Labels = typeof import("../../../../../messages/en.json")["reviews"];

export function ReviewForm({
  productId,
  isAuthenticated,
  labels,
}: {
  productId: string;
  isAuthenticated: boolean;
  labels: Labels;
}) {
  const [rating, setRating] = useState(5);
  const [state, formAction, pending] = useActionState<ReviewFormState, FormData>(submitReview, {});

  if (!isAuthenticated) {
    return (
      <p className="mt-6 rounded-[10px] border border-line bg-white p-5 text-sm">
        <Link href="/login" className="font-bold text-navy hover:underline">
          {labels.loginToReview} →
        </Link>
      </p>
    );
  }

  if (state.success) {
    return (
      <p className="mt-6 rounded-[10px] bg-[#EEF4EC] p-5 text-sm font-semibold text-save-green">
        {state.success}
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-6 flex max-w-[560px] flex-col gap-3 rounded-[10px] border border-line bg-white p-5">
      <h3 className="font-heading text-lg font-bold uppercase tracking-[1px]">{labels.writeReview}</h3>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />
      <div className="flex items-center gap-1" role="radiogroup" aria-label={labels.rating}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            onClick={() => setRating(n)}
            className={cn("text-3xl transition-colors", n <= rating ? "text-[#E8A33D]" : "text-line hover:text-[#E8A33D]")}
          >
            ★
          </button>
        ))}
      </div>
      <Input name="title" placeholder={labels.reviewTitle} maxLength={120} className="h-11" />
      <textarea
        name="body"
        placeholder={labels.reviewBody}
        maxLength={2000}
        rows={4}
        className="rounded-2xl border border-line bg-white px-5 py-3 text-base text-ink outline-none transition-colors placeholder:text-gray-4 focus:border-navy"
      />
      {state.error ? <p className="text-sm font-semibold text-deal-red">{state.error}</p> : null}
      <Button type="submit" className="self-start" disabled={pending}>
        {labels.submit}
      </Button>
    </form>
  );
}
