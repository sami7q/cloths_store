"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifiedUserId } from "@/lib/auth-guards";
import { messages } from "@/lib/i18n";

export type ReviewFormState = { error?: string; success?: string };

const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().max(2000).optional(),
});

export async function submitReview(_prev: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  const userId = await verifiedUserId();
  if (!userId) return { error: messages.reviews.loginToReview };

  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: messages.reviews.reviewError };

  const product = await db.product.findUnique({
    where: { id: parsed.data.productId },
    select: { id: true, slug: true, name: true },
  });
  if (!product) return { error: messages.reviews.reviewError };

  const existing = await db.review.findFirst({
    where: { productId: product.id, userId },
  });
  if (existing) return { error: messages.reviews.alreadyReviewed };

  await db.review.create({
    data: {
      productId: product.id,
      userId,
      rating: parsed.data.rating,
      title: parsed.data.title || null,
      body: parsed.data.body || null,
      status: "PENDING",
    },
  });
  await db.notification.create({
    data: {
      type: "PENDING_REVIEW",
      title: "Review awaiting moderation",
      body: `New review for ${product.name}`,
      link: "/admin/reviews",
    },
  });
  revalidatePath(`/product/${product.slug}`);
  return { success: messages.reviews.pendingNote };
}
