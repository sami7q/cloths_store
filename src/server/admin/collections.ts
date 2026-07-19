"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth-guards";
import { audit } from "@/lib/admin/audit";
import { storage } from "@/lib/storage";
import { messages } from "@/lib/i18n";

/** Admin Collections module (§6.5) — these power the homepage carousels. */

const t = messages.admin;

const collectionSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(80),
  nameAr: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  isActive: z.boolean(),
});

export type CollectionResult = { ok: true; id: string; message: string } | { ok: false; error: string };

export async function saveCollection(formData: FormData): Promise<CollectionResult> {
  let actor;
  try {
    actor = await requireAdminAction("collections");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = collectionSchema.safeParse({
    id: String(formData.get("id") ?? "") || undefined,
    name: formData.get("name"),
    nameAr: formData.get("nameAr"),
    slug: formData.get("slug"),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { ok: false, error: t.common.error };
  const input = parsed.data;

  const clash = await db.collection.findFirst({
    where: { slug: input.slug, NOT: input.id ? { id: input.id } : undefined },
    select: { id: true },
  });
  if (clash) return { ok: false, error: t.products.slugTaken };

  let imageUrl: string | undefined;
  const imageFile = formData.get("image");
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      imageUrl = await storage.putFile(imageFile, "collections");
    } catch {
      return { ok: false, error: t.common.error };
    }
  }

  const data = {
    name: input.name,
    nameAr: input.nameAr,
    slug: input.slug,
    isActive: input.isActive,
    ...(imageUrl ? { imageUrl } : {}),
  };

  let id: string;
  if (input.id) {
    await db.collection.update({ where: { id: input.id }, data });
    id = input.id;
    await audit(actor.userId, "collection.update", "Collection", id);
  } else {
    const created = await db.collection.create({ data });
    id = created.id;
    await audit(actor.userId, "collection.create", "Collection", id);
  }
  revalidatePath("/admin/collections");
  revalidatePath("/");
  return { ok: true, id, message: t.collections.collectionSaved };
}

export async function deleteCollection(formData: FormData): Promise<CollectionResult> {
  let actor;
  try {
    actor = await requireAdminAction("collections");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const id = String(formData.get("id") ?? "");
  const collection = await db.collection.findUnique({ where: { id } });
  if (!collection) return { ok: false, error: t.common.error };

  // A BUNDLE_PRICE promo referencing this collection's slug would silently
  // stop matching — block the delete instead of breaking the promo.
  const rules = await db.promoRule.findMany({ where: { type: "BUNDLE_PRICE", isActive: true } });
  const referenced = rules.some(
    (r) => ((r.config as { collectionSlug?: string } | null)?.collectionSlug ?? "") === collection.slug,
  );
  if (referenced) return { ok: false, error: t.collections.deleteBlockedPromo };

  await db.collection.delete({ where: { id } });
  await audit(actor.userId, "collection.delete", "Collection", id, { name: collection.name });
  revalidatePath("/admin/collections");
  revalidatePath("/");
  return { ok: true, id, message: t.collections.collectionDeleted };
}

const assignSchema = z.object({
  collectionId: z.string().min(1),
  productIds: z.array(z.string().min(1)).max(200),
});

/** Replace the assignment set; array order becomes CollectionProduct.sortOrder. */
export async function setCollectionProducts(raw: unknown): Promise<CollectionResult> {
  let actor;
  try {
    actor = await requireAdminAction("collections");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = assignSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.common.error };
  const { collectionId, productIds } = parsed.data;

  const valid = await db.product.findMany({ where: { id: { in: productIds } }, select: { id: true } });
  const validIds = new Set(valid.map((p) => p.id));
  const ordered = productIds.filter((id) => validIds.has(id));

  await db.$transaction([
    db.collectionProduct.deleteMany({ where: { collectionId } }),
    ...(ordered.length
      ? [
          db.collectionProduct.createMany({
            data: ordered.map((productId, index) => ({ collectionId, productId, sortOrder: index })),
          }),
        ]
      : []),
  ]);
  await audit(actor.userId, "collection.products", "Collection", collectionId, { count: ordered.length });
  revalidatePath("/admin/collections");
  revalidatePath("/");
  return { ok: true, id: collectionId, message: t.collections.collectionSaved };
}
