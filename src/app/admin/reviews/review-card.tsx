"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { messages } from "@/lib/i18n";
import { saveReviewReply, setReviewStatus, type ReplyState } from "@/server/admin/reviews";
import { StatusPill } from "@/components/admin/list-controls";

const t = messages.admin;
const tr = t.reviewsMod;
const initial: ReplyState = {};

export type ReviewItem = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
  adminReply: string | null;
  createdAt: string;
  userName: string;
  productId: string;
  productName: string;
  productSlug: string;
};

export function ReviewCard({ review, canEdit }: { review: ReviewItem; canEdit: boolean }) {
  const [showReply, setShowReply] = useState(Boolean(review.adminReply));
  const [state, action, pending] = useActionState(saveReviewReply, initial);

  return (
    <article className="rounded-2xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[15px] font-bold text-[#F59E0B]">
          {"★".repeat(review.rating)}
          <span className="text-line">{"★".repeat(5 - review.rating)}</span>
        </span>
        <StatusPill status={review.status} />
        <span className="text-sm text-gray-4">
          {review.userName} — {tr.on}{" "}
          <Link href={`/admin/products/${review.productId}`} className="font-bold text-navy hover:underline">
            {review.productName}
          </Link>{" "}
          — {review.createdAt}
        </span>
      </div>

      {review.title && <p className="mt-2 font-bold text-ink">{review.title}</p>}
      {review.body && <p className="mt-1 text-sm text-gray-6">{review.body}</p>}

      {review.adminReply && !showReply && (
        <p className="mt-2 rounded-xl bg-card px-4 py-2.5 text-sm text-gray-6">
          <span className="font-bold text-navy">{tr.adminReplyLabel}: </span>
          {review.adminReply}
        </p>
      )}

      {canEdit && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {review.status !== "APPROVED" && (
            <form action={setReviewStatus}>
              <input type="hidden" name="id" value={review.id} />
              <input type="hidden" name="status" value="APPROVED" />
              <button
                type="submit"
                className="h-9 rounded-full bg-save-green px-4 text-xs font-bold uppercase tracking-[0.5px] text-white hover:opacity-90"
              >
                {tr.approve}
              </button>
            </form>
          )}
          {review.status !== "REJECTED" && (
            <form action={setReviewStatus}>
              <input type="hidden" name="id" value={review.id} />
              <input type="hidden" name="status" value="REJECTED" />
              <button
                type="submit"
                className="h-9 rounded-full border border-line px-4 text-xs font-bold uppercase tracking-[0.5px] text-deal-red hover:border-deal-red"
              >
                {tr.reject}
              </button>
            </form>
          )}
          <button
            type="button"
            onClick={() => setShowReply((s) => !s)}
            className="h-9 rounded-full border border-line px-4 text-xs font-bold uppercase tracking-[0.5px] hover:border-navy"
          >
            {tr.reply}
          </button>
        </div>
      )}

      {canEdit && showReply && (
        <form action={action} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="id" value={review.id} />
          <textarea
            name="adminReply"
            defaultValue={review.adminReply ?? ""}
            rows={2}
            maxLength={1000}
            placeholder={tr.replyPlaceholder}
            className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none placeholder:text-gray-4 focus:border-navy"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="h-9 rounded-full bg-navy px-4 text-xs font-bold uppercase tracking-[0.5px] text-white hover:bg-navy-deep disabled:opacity-50"
            >
              {pending ? t.common.saving : tr.saveReply}
            </button>
            {state.success && <span className="text-sm font-bold text-save-green">{state.success}</span>}
            {state.error && <span className="text-sm font-bold text-deal-red">{state.error}</span>}
          </div>
        </form>
      )}
    </article>
  );
}
