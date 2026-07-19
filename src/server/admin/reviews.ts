"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth-guards";
import { audit } from "@/lib/admin/audit";
import { messages } from "@/lib/i18n";

/** Admin Reviews moderation (§6.9). */

const t = messages.admin;

async function loadReview(id: string) {
  return db.review.findUnique({ where: { id }, include: { product: { select: { slug: true } } } });
}

export async function setReviewStatus(formData: FormData): Promise<void> {
  const { userId } = await requireAdminAction("reviews");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (status !== "APPROVED" && status !== "REJECTED") return;
  const review = await loadReview(id);
  if (!review) return;
  await db.review.update({ where: { id }, data: { status } });
  await audit(userId, "review.moderate", "Review", id, { from: review.status, to: status });
  revalidatePath("/admin/reviews");
  revalidatePath(`/product/${review.product.slug}`);
}

export type ReplyState = { error?: string; success?: string };

export async function saveReviewReply(_prev: ReplyState, formData: FormData): Promise<ReplyState> {
  try {
    const { userId } = await requireAdminAction("reviews");
    const id = String(formData.get("id") ?? "");
    const reply = String(formData.get("adminReply") ?? "").trim().slice(0, 1000);
    const review = await loadReview(id);
    if (!review) return { error: t.common.error };
    await db.review.update({ where: { id }, data: { adminReply: reply || null } });
    await audit(userId, "review.reply", "Review", id);
    revalidatePath("/admin/reviews");
    revalidatePath(`/product/${review.product.slug}`);
    return { success: t.reviewsMod.replySaved };
  } catch {
    return { error: t.common.forbidden };
  }
}
