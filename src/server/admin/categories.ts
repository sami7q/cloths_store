"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth-guards";
import { audit } from "@/lib/admin/audit";
import { storage } from "@/lib/storage";
import { messages } from "@/lib/i18n";

/** Admin Categories module (§6.4): CRUD, ordering, icons, banner images. */

const t = messages.admin;

function revalidateCategories(slug?: string | null) {
  revalidatePath("/admin/categories");
  revalidatePath("/");
  if (slug) revalidatePath(`/category/${slug}`);
}

/** Reject SVG markup that could execute script when rendered inline. */
function sanitizeSvg(svg: string): string | null {
  const trimmed = svg.trim();
  if (!trimmed) return null;
  if (!/^<svg[\s>]/i.test(trimmed) || !/<\/svg>\s*$/i.test(trimmed)) return null;
  if (/<script|javascript:|on\w+\s*=|<foreignObject|href\s*=\s*["']?(?!#)/i.test(trimmed)) return null;
  return trimmed.slice(0, 20000);
}

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(80),
  nameAr: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  parentId: z.string().optional(),
  iconSvg: z.string().max(20000).optional(),
  isActive: z.boolean(),
});

export type CategoryResult = { ok: true; message: string } | { ok: false; error: string };

export async function saveCategory(formData: FormData): Promise<CategoryResult> {
  let actor;
  try {
    actor = await requireAdminAction("categories");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = categorySchema.safeParse({
    id: String(formData.get("id") ?? "") || undefined,
    name: formData.get("name"),
    nameAr: formData.get("nameAr"),
    slug: formData.get("slug"),
    parentId: String(formData.get("parentId") ?? "") || undefined,
    iconSvg: String(formData.get("iconSvg") ?? "") || undefined,
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { ok: false, error: t.common.error };
  const input = parsed.data;

  if (input.parentId && input.parentId === input.id) return { ok: false, error: t.common.error };
  const clash = await db.category.findFirst({
    where: { slug: input.slug, NOT: input.id ? { id: input.id } : undefined },
    select: { id: true },
  });
  if (clash) return { ok: false, error: t.products.slugTaken };

  // Icon: pasted SVG markup wins; an uploaded .svg file is read into markup.
  let iconSvg: string | null | undefined = input.iconSvg ? sanitizeSvg(input.iconSvg) : undefined;
  const iconFile = formData.get("iconFile");
  if (iconFile instanceof File && iconFile.size > 0) {
    if (iconFile.type !== "image/svg+xml" || iconFile.size > 100 * 1024) return { ok: false, error: t.common.error };
    iconSvg = sanitizeSvg(await iconFile.text());
    if (!iconSvg) return { ok: false, error: t.common.error };
  }
  if (input.iconSvg && iconSvg === null) return { ok: false, error: t.common.error };
  if (formData.get("clearIcon") === "on") iconSvg = null;

  let imageUrl: string | undefined;
  const imageFile = formData.get("image");
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      imageUrl = await storage.putFile(imageFile, "categories");
    } catch {
      return { ok: false, error: t.common.error };
    }
  }

  const data = {
    name: input.name,
    nameAr: input.nameAr,
    slug: input.slug,
    parentId: input.parentId ?? null,
    isActive: input.isActive,
    ...(iconSvg !== undefined ? { iconSvg } : {}),
    ...(imageUrl ? { imageUrl } : {}),
  };

  if (input.id) {
    await db.category.update({ where: { id: input.id }, data });
    await audit(actor.userId, "category.update", "Category", input.id);
  } else {
    const last = await db.category.findFirst({
      where: { parentId: input.parentId ?? null },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const created = await db.category.create({ data: { ...data, sortOrder: (last?.sortOrder ?? -1) + 1 } });
    await audit(actor.userId, "category.create", "Category", created.id);
  }
  revalidateCategories(input.slug);
  return { ok: true, message: t.categories.categorySaved };
}

export async function deleteCategory(formData: FormData): Promise<CategoryResult> {
  let actor;
  try {
    actor = await requireAdminAction("categories");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const id = String(formData.get("id") ?? "");
  const category = await db.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true, children: true } } },
  });
  if (!category) return { ok: false, error: t.common.error };
  const blockers = category._count.products + category._count.children;
  if (blockers > 0)
    return { ok: false, error: t.categories.deleteBlocked.replace("{count}", String(blockers)) };
  await db.category.delete({ where: { id } });
  await audit(actor.userId, "category.delete", "Category", id, { name: category.name });
  revalidateCategories(category.slug);
  return { ok: true, message: t.categories.categoryDeleted };
}

const reorderSchema = z.object({
  parentId: z.string().nullable(),
  orderedIds: z.array(z.string().min(1)).max(200),
});

export async function reorderCategories(raw: unknown): Promise<CategoryResult> {
  let actor;
  try {
    actor = await requireAdminAction("categories");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = reorderSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.common.error };
  const { parentId, orderedIds } = parsed.data;
  await db.$transaction(
    orderedIds.map((id, index) =>
      db.category.updateMany({ where: { id, parentId }, data: { sortOrder: index } }),
    ),
  );
  await audit(actor.userId, "category.reorder", "Category", parentId ?? "root");
  revalidateCategories();
  return { ok: true, message: t.categories.categorySaved };
}
