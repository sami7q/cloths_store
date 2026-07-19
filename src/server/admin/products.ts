"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth-guards";
import { audit } from "@/lib/admin/audit";
import { parseCsv } from "@/lib/admin/csv";
import { storage } from "@/lib/storage";
import { messages } from "@/lib/i18n";
import { PRODUCT_STATUSES } from "@/lib/enums";
import { toNumber } from "@/lib/format";

/** Mutating actions for the admin Products module (§6.3). */

const t = messages.admin;

function revalidateProduct(slug?: string | null) {
  revalidatePath("/admin/products");
  revalidatePath("/");
  if (slug) revalidatePath(`/product/${slug}`);
}

// -- general / pricing / seo / visibility ------------------------------------

const generalSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(160),
  nameAr: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(1).max(8000),
  descriptionAr: z.string().trim().min(1).max(8000),
  categoryId: z.string().min(1),
  material: z.string().trim().max(120).optional(),
  brand: z.string().trim().max(120).optional(),
  sku: z.string().trim().min(2).max(60),
  barcode: z.string().trim().max(60).optional(),
  weight: z.coerce.number().int().min(0).max(100000).optional(),
  tags: z.string().max(600).optional(),
});

export type SaveResult = { ok: true; id: string; message: string } | { ok: false; error: string };

export async function saveProductGeneral(raw: unknown): Promise<SaveResult> {
  let actor;
  try {
    actor = await requireAdminAction("products");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = generalSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.common.error };
  const { id, tags, weight, material, brand, barcode, ...fields } = parsed.data;
  const data = {
    ...fields,
    material: material || null,
    brand: brand || null,
    barcode: barcode || null,
    weight: weight ?? null,
    tags: (tags ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };

  const clash = await db.product.findFirst({
    where: { OR: [{ slug: data.slug }, { sku: data.sku }], NOT: id ? { id } : undefined },
    select: { id: true },
  });
  if (clash) return { ok: false, error: t.products.slugTaken };

  if (id) {
    const updated = await db.product.update({ where: { id }, data });
    await audit(actor.userId, "product.update", "Product", id, { tab: "general" });
    revalidateProduct(updated.slug);
    return { ok: true, id, message: t.products.productSaved };
  }
  const created = await db.product.create({ data: { ...data, basePrice: 0, status: "DRAFT" } });
  await audit(actor.userId, "product.create", "Product", created.id);
  revalidateProduct(created.slug);
  return { ok: true, id: created.id, message: t.products.productCreated };
}

const pricingSchema = z.object({
  id: z.string().min(1),
  basePrice: z.coerce.number().min(0).max(10_000_000),
  compareAtPrice: z.coerce.number().min(0).max(10_000_000).nullable(),
  costPrice: z.coerce.number().min(0).max(10_000_000).nullable(),
  cardPriceMode: z.enum(["auto", "manual", "none"]),
  cardPrice: z.coerce.number().min(0).max(10_000_000).nullable(),
});

export async function saveProductPricing(raw: unknown): Promise<SaveResult> {
  let actor;
  try {
    actor = await requireAdminAction("products");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = pricingSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.common.error };
  const input = parsed.data;

  let cardPrice: number | null = null;
  if (input.cardPriceMode === "manual") cardPrice = input.cardPrice;
  else if (input.cardPriceMode === "auto") {
    // Recomputed server-side from the live card promo — client suggestion ignored.
    const rule = await db.promoRule.findFirst({ where: { type: "CARD_EXTRA_PERCENT", isActive: true } });
    const percent = (rule?.config as { percentOff?: number } | null)?.percentOff;
    if (percent) cardPrice = Math.round(input.basePrice * (1 - percent / 100) * 100) / 100;
  }

  const updated = await db.product.update({
    where: { id: input.id },
    data: {
      basePrice: input.basePrice,
      compareAtPrice: input.compareAtPrice,
      costPrice: input.costPrice,
      cardPrice,
    },
  });
  await audit(actor.userId, "product.update", "Product", input.id, { tab: "pricing" });
  revalidateProduct(updated.slug);
  return { ok: true, id: input.id, message: t.products.productSaved };
}

const seoSchema = z.object({
  id: z.string().min(1),
  seoTitle: z.string().trim().max(160).optional(),
  seoDescription: z.string().trim().max(320).optional(),
});

export async function saveProductSeo(raw: unknown): Promise<SaveResult> {
  let actor;
  try {
    actor = await requireAdminAction("products");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = seoSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.common.error };
  const updated = await db.product.update({
    where: { id: parsed.data.id },
    data: { seoTitle: parsed.data.seoTitle || null, seoDescription: parsed.data.seoDescription || null },
  });
  await audit(actor.userId, "product.update", "Product", parsed.data.id, { tab: "seo" });
  revalidateProduct(updated.slug);
  return { ok: true, id: parsed.data.id, message: t.products.productSaved };
}

const visibilitySchema = z.object({
  id: z.string().min(1),
  status: z.enum(PRODUCT_STATUSES),
  isFeatured: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(100000),
});

export async function saveProductVisibility(raw: unknown): Promise<SaveResult> {
  let actor;
  try {
    actor = await requireAdminAction("products");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = visibilitySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.common.error };
  const updated = await db.product.update({ where: { id: parsed.data.id }, data: parsed.data });
  await audit(actor.userId, "product.update", "Product", parsed.data.id, { tab: "visibility" });
  revalidateProduct(updated.slug);
  return { ok: true, id: parsed.data.id, message: t.products.productSaved };
}

// -- variants matrix ---------------------------------------------------------

const variantsSchema = z.object({
  productId: z.string().min(1),
  rows: z
    .array(
      z.object({
        id: z.string().optional(),
        colorName: z.string().trim().min(1).max(60),
        colorHex: z
          .string()
          .trim()
          .regex(/^#[0-9a-fA-F]{3,8}$/),
        size: z.string().trim().min(1).max(20),
        sku: z.string().trim().min(2).max(60),
        price: z.number().min(0).max(10_000_000).nullable(),
        stock: z.number().int().min(0).max(1_000_000),
        lowStockAt: z.number().int().min(0).max(10_000),
        isActive: z.boolean(),
      }),
    )
    .max(400),
});

export type VariantsResult =
  | { ok: true; message: string; deactivated: number }
  | { ok: false; error: string };

export async function saveVariants(raw: unknown): Promise<VariantsResult> {
  let actor;
  try {
    actor = await requireAdminAction("products");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = variantsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.common.error };
  const { productId, rows } = parsed.data;

  const combos = new Set(rows.map((r) => `${r.colorName}|${r.size}`));
  const skus = new Set(rows.map((r) => r.sku));
  if (combos.size !== rows.length || skus.size !== rows.length) return { ok: false, error: t.products.slugTaken };

  const product = await db.product.findUnique({ where: { id: productId }, select: { slug: true } });
  if (!product) return { ok: false, error: t.common.error };

  const existing = await db.variant.findMany({
    where: { productId },
    include: { _count: { select: { orderItems: true } } },
  });
  const keptIds = new Set(rows.filter((r) => r.id).map((r) => r.id as string));
  const removed = existing.filter((v) => !keptIds.has(v.id));
  // Removed rows: hard-delete unless referenced by orders — those deactivate.
  const toDelete = removed.filter((v) => v._count.orderItems === 0).map((v) => v.id);
  const toDeactivate = removed.filter((v) => v._count.orderItems > 0).map((v) => v.id);

  const skuClash = await db.variant.findFirst({
    where: { sku: { in: [...skus] }, productId: { not: productId } },
    select: { id: true },
  });
  if (skuClash) return { ok: false, error: t.products.slugTaken };

  try {
    await db.$transaction(async (tx) => {
      if (toDelete.length) await tx.variant.deleteMany({ where: { id: { in: toDelete } } });
      if (toDeactivate.length)
        await tx.variant.updateMany({ where: { id: { in: toDeactivate } }, data: { isActive: false } });
      for (const row of rows) {
        const data = {
          colorName: row.colorName,
          colorHex: row.colorHex,
          size: row.size,
          sku: row.sku,
          price: row.price,
          stock: row.stock,
          lowStockAt: row.lowStockAt,
          isActive: row.isActive,
        };
        if (row.id) await tx.variant.update({ where: { id: row.id }, data });
        else await tx.variant.create({ data: { ...data, productId } });
      }
    });
  } catch {
    return { ok: false, error: t.products.slugTaken };
  }

  await audit(actor.userId, "product.variants", "Product", productId, {
    rows: rows.length,
    deleted: toDelete.length,
    deactivated: toDeactivate.length,
  });
  revalidateProduct(product.slug);
  return { ok: true, message: t.products.variantsSaved, deactivated: toDeactivate.length };
}

// -- media -------------------------------------------------------------------

export type MediaResult = { ok: true } | { ok: false; error: string };

export async function uploadProductImages(formData: FormData): Promise<MediaResult> {
  let actor;
  try {
    actor = await requireAdminAction("products");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const productId = String(formData.get("productId") ?? "");
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { slug: true, name: true, images: { select: { sortOrder: true }, orderBy: { sortOrder: "desc" }, take: 1 } },
  });
  if (!product) return { ok: false, error: t.common.error };

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { ok: false, error: t.common.error };
  let sortOrder = (product.images[0]?.sortOrder ?? -1) + 1;
  try {
    for (const file of files.slice(0, 12)) {
      const url = await storage.putFile(file, "products");
      await db.productImage.create({ data: { productId, url, alt: product.name, sortOrder: sortOrder++ } });
    }
  } catch {
    return { ok: false, error: t.common.error };
  }
  await audit(actor.userId, "product.media.upload", "Product", productId, { count: files.length });
  revalidateProduct(product.slug);
  return { ok: true };
}

const imageMetaSchema = z.object({
  imageId: z.string().min(1),
  alt: z.string().trim().max(200),
  variantColorRef: z.string().trim().max(60).nullable(),
});

export async function updateProductImage(raw: unknown): Promise<MediaResult> {
  let actor;
  try {
    actor = await requireAdminAction("products");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = imageMetaSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.common.error };
  const image = await db.productImage.update({
    where: { id: parsed.data.imageId },
    data: { alt: parsed.data.alt, variantColorRef: parsed.data.variantColorRef },
    include: { product: { select: { slug: true, id: true } } },
  });
  await audit(actor.userId, "product.media.update", "Product", image.product.id);
  revalidateProduct(image.product.slug);
  return { ok: true };
}

export async function reorderProductImages(productId: string, orderedIds: string[]): Promise<MediaResult> {
  let actor;
  try {
    actor = await requireAdminAction("products");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  if (!Array.isArray(orderedIds) || orderedIds.length > 50) return { ok: false, error: t.common.error };
  const product = await db.product.findUnique({ where: { id: productId }, select: { slug: true } });
  if (!product) return { ok: false, error: t.common.error };
  await db.$transaction(
    orderedIds.map((id, index) =>
      db.productImage.updateMany({ where: { id, productId }, data: { sortOrder: index } }),
    ),
  );
  await audit(actor.userId, "product.media.reorder", "Product", productId);
  revalidateProduct(product.slug);
  return { ok: true };
}

export async function deleteProductImage(imageId: string): Promise<MediaResult> {
  let actor;
  try {
    actor = await requireAdminAction("products");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const image = await db.productImage.findUnique({
    where: { id: imageId },
    include: { product: { select: { id: true, slug: true } } },
  });
  if (!image) return { ok: false, error: t.common.error };
  await db.productImage.delete({ where: { id: imageId } });
  await storage.deleteFile(image.url);
  await audit(actor.userId, "product.media.delete", "Product", image.product.id);
  revalidateProduct(image.product.slug);
  return { ok: true };
}

// -- duplicate / archive / bulk ----------------------------------------------

export async function duplicateProduct(formData: FormData): Promise<void> {
  const { userId } = await requireAdminAction("products");
  const id = String(formData.get("id") ?? "");
  const source = await db.product.findUnique({ where: { id }, include: { images: true, variants: true } });
  if (!source) return;
  const stamp = Date.now().toString(36).slice(-5);
  const copy = await db.product.create({
    data: {
      name: `${source.name} (copy)`,
      nameAr: `${source.nameAr} (نسخة)`,
      slug: `${source.slug}-copy-${stamp}`,
      description: source.description,
      descriptionAr: source.descriptionAr,
      material: source.material,
      brand: source.brand,
      categoryId: source.categoryId,
      basePrice: source.basePrice,
      compareAtPrice: source.compareAtPrice,
      cardPrice: source.cardPrice,
      costPrice: source.costPrice,
      sku: `${source.sku}-C${stamp.toUpperCase()}`,
      barcode: null,
      weight: source.weight,
      tags: source.tags as string[],
      status: "DRAFT",
      isFeatured: false,
      sortOrder: source.sortOrder,
      seoTitle: source.seoTitle,
      seoDescription: source.seoDescription,
      images: {
        create: source.images.map((img) => ({
          url: img.url,
          alt: img.alt,
          sortOrder: img.sortOrder,
          variantColorRef: img.variantColorRef,
        })),
      },
      variants: {
        create: source.variants.map((v, i) => ({
          colorName: v.colorName,
          colorHex: v.colorHex,
          size: v.size,
          sku: `${v.sku}-C${stamp.toUpperCase()}${i}`,
          price: v.price,
          stock: 0,
          lowStockAt: v.lowStockAt,
          isActive: v.isActive,
        })),
      },
    },
  });
  await audit(userId, "product.duplicate", "Product", copy.id, { from: id });
  revalidatePath("/admin/products");
}

export async function archiveProduct(formData: FormData): Promise<void> {
  const { userId } = await requireAdminAction("products");
  const id = String(formData.get("id") ?? "");
  const updated = await db.product.update({ where: { id }, data: { status: "ARCHIVED" } });
  await audit(userId, "product.archive", "Product", id);
  revalidateProduct(updated.slug);
}

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  action: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("status"), status: z.enum(PRODUCT_STATUSES) }),
    z.object({ kind: z.literal("price"), percent: z.number().min(-90).max(500) }),
  ]),
});

export type BulkResult = { ok: true; affected: number } | { ok: false; error: string };

export async function bulkUpdateProducts(raw: unknown): Promise<BulkResult> {
  let actor;
  try {
    actor = await requireAdminAction("products");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = bulkSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.common.error };
  const { ids, action } = parsed.data;

  if (action.kind === "status") {
    const res = await db.product.updateMany({ where: { id: { in: ids } }, data: { status: action.status } });
    await audit(actor.userId, "product.bulkStatus", "Product", "*", { ids: ids.length, status: action.status });
    revalidatePath("/admin/products");
    revalidatePath("/");
    return { ok: true, affected: res.count };
  }

  const products = await db.product.findMany({ where: { id: { in: ids } }, select: { id: true, basePrice: true } });
  const factor = 1 + action.percent / 100;
  await db.$transaction(
    products.map((p) =>
      db.product.update({
        where: { id: p.id },
        data: { basePrice: Math.round(toNumber(p.basePrice) * factor * 100) / 100 },
      }),
    ),
  );
  await audit(actor.userId, "product.bulkPrice", "Product", "*", { ids: ids.length, percent: action.percent });
  revalidatePath("/admin/products");
  revalidatePath("/");
  return { ok: true, affected: products.length };
}

// -- CSV import --------------------------------------------------------------

const IMPORT_COLUMNS = [
  "sku",
  "slug",
  "name",
  "nameAr",
  "description",
  "descriptionAr",
  "categorySlug",
  "basePrice",
  "compareAtPrice",
  "cardPrice",
  "costPrice",
  "material",
  "brand",
  "tags",
  "status",
] as const;

export type ImportResult = { ok: true; created: number; updated: number; skipped: number } | { ok: false; error: string };

export async function importProductsCsv(formData: FormData): Promise<ImportResult> {
  let actor;
  try {
    actor = await requireAdminAction("products");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 2 * 1024 * 1024)
    return { ok: false, error: t.common.error };

  const rows = parseCsv(await file.text());
  if (rows.length < 2) return { ok: false, error: t.common.error };
  const header = rows[0].map((h) => h.trim());
  const idx = (name: (typeof IMPORT_COLUMNS)[number]) => header.indexOf(name);
  if (idx("sku") === -1 || idx("name") === -1) return { ok: false, error: t.common.error };

  const categories = await db.category.findMany({ select: { id: true, slug: true } });
  const catBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const row of rows.slice(1).slice(0, 1000)) {
    const cell = (name: (typeof IMPORT_COLUMNS)[number]) => {
      const i = idx(name);
      return i === -1 ? "" : (row[i] ?? "").trim();
    };
    const sku = cell("sku");
    const name = cell("name");
    if (!sku || !name) {
      skipped++;
      continue;
    }
    const num = (v: string) => (v === "" || Number.isNaN(Number(v)) ? null : Number(v));
    const status = (PRODUCT_STATUSES as readonly string[]).includes(cell("status")) ? cell("status") : undefined;
    const categoryId = catBySlug.get(cell("categorySlug"));
    const patch = {
      name,
      nameAr: cell("nameAr") || name,
      description: cell("description"),
      descriptionAr: cell("descriptionAr") || cell("description"),
      material: cell("material") || null,
      brand: cell("brand") || null,
      basePrice: num(cell("basePrice")),
      compareAtPrice: num(cell("compareAtPrice")),
      cardPrice: num(cell("cardPrice")),
      costPrice: num(cell("costPrice")),
      tags: cell("tags")
        ? cell("tags")
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      status,
      categoryId,
    };

    const existing = await db.product.findUnique({ where: { sku }, select: { id: true } });
    try {
      if (existing) {
        await db.product.update({
          where: { id: existing.id },
          data: {
            ...patch,
            basePrice: patch.basePrice ?? undefined,
            description: patch.description || undefined,
            descriptionAr: patch.descriptionAr || undefined,
            categoryId: categoryId ?? undefined,
          },
        });
        updated++;
      } else {
        if (!categoryId || patch.basePrice === null || !patch.description) {
          skipped++;
          continue;
        }
        const slug = cell("slug") || sku.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        await db.product.create({
          data: {
            ...patch,
            sku,
            slug,
            categoryId,
            basePrice: patch.basePrice,
            description: patch.description,
            descriptionAr: patch.descriptionAr,
            tags: patch.tags ?? [],
            status: status ?? "DRAFT",
          },
        });
        created++;
      }
    } catch {
      skipped++;
    }
  }

  await audit(actor.userId, "product.import", "Product", "*", { created, updated, skipped });
  revalidatePath("/admin/products");
  revalidatePath("/");
  return { ok: true, created, updated, skipped };
}
