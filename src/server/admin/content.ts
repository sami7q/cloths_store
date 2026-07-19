"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth-guards";
import { audit } from "@/lib/admin/audit";
import { storage } from "@/lib/storage";
import { messages } from "@/lib/i18n";
import { BANNER_PLACEMENTS } from "@/lib/enums";

/** Admin Content/CMS module (§6.10): banners, static pages, nav/footer links. */

const t = messages.admin;

function revalidateContent(pageSlug?: string) {
  revalidatePath("/admin/content");
  revalidatePath("/", "layout"); // chrome (marquee, side tab, nav, footer) + homepage
  if (pageSlug) revalidatePath(`/pages/${pageSlug}`);
}

export type ContentResult = { ok: true; message: string } | { ok: false; error: string };

// -- banners -----------------------------------------------------------------

const bannerSchema = z.object({
  id: z.string().optional(),
  placement: z.enum(BANNER_PLACEMENTS),
  title: z.string().trim().max(200),
  titleAr: z.string().trim().max(200),
  subtitle: z.string().trim().max(300),
  subtitleAr: z.string().trim().max(300),
  linkUrl: z.string().trim().max(300),
  badge: z.string().trim().max(60),
  caption: z.string().trim().max(120),
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
  endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).max(1000),
  isActive: z.boolean(),
});

export async function saveBanner(formData: FormData): Promise<ContentResult> {
  let actor;
  try {
    actor = await requireAdminAction("content");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = bannerSchema.safeParse({
    id: String(formData.get("id") ?? "") || undefined,
    placement: formData.get("placement"),
    title: formData.get("title") ?? "",
    titleAr: formData.get("titleAr") ?? "",
    subtitle: formData.get("subtitle") ?? "",
    subtitleAr: formData.get("subtitleAr") ?? "",
    linkUrl: formData.get("linkUrl") ?? "",
    badge: formData.get("badge") ?? "",
    caption: formData.get("caption") ?? "",
    startsAt: formData.get("startsAt") ?? "",
    endsAt: formData.get("endsAt") ?? "",
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { ok: false, error: t.common.error };
  const input = parsed.data;

  const existing = input.id ? await db.banner.findUnique({ where: { id: input.id } }) : null;
  if (input.id && !existing) return { ok: false, error: t.common.error };

  let imageUrl: string | undefined;
  const imageFile = formData.get("image");
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      imageUrl = await storage.putFile(imageFile, "banners");
    } catch {
      return { ok: false, error: t.common.error };
    }
  }

  // Merge config so unmanaged keys (e.g. seed gradient `style`) survive edits.
  const config: Record<string, unknown> = { ...((existing?.config as Record<string, unknown>) ?? {}) };
  for (const [key, value] of [
    ["badge", input.badge],
    ["caption", input.caption],
    ["startsAt", input.startsAt],
    ["endsAt", input.endsAt],
  ] as const) {
    if (value) config[key] = value;
    else delete config[key];
  }

  const data = {
    placement: input.placement,
    title: input.title || null,
    titleAr: input.titleAr || null,
    subtitle: input.subtitle || null,
    subtitleAr: input.subtitleAr || null,
    linkUrl: input.linkUrl || null,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
    config: JSON.parse(JSON.stringify(config)) as object,
    ...(imageUrl ? { imageUrl } : {}),
  };

  if (existing) {
    await db.banner.update({ where: { id: existing.id }, data });
    await audit(actor.userId, "banner.update", "Banner", existing.id, { placement: input.placement });
  } else {
    const created = await db.banner.create({ data });
    await audit(actor.userId, "banner.create", "Banner", created.id, { placement: input.placement });
  }
  revalidateContent();
  return { ok: true, message: t.content.itemSaved };
}

export async function deleteBanner(formData: FormData): Promise<void> {
  const { userId } = await requireAdminAction("content");
  const id = String(formData.get("id") ?? "");
  const banner = await db.banner.findUnique({ where: { id } });
  if (!banner) return;
  await db.banner.delete({ where: { id } });
  if (banner.imageUrl) await storage.deleteFile(banner.imageUrl);
  await audit(userId, "banner.delete", "Banner", id, { placement: banner.placement });
  revalidateContent();
}

// -- static pages ------------------------------------------------------------

const pageSchema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(2).max(160),
  titleAr: z.string().trim().min(2).max(160),
  contentRich: z.string().min(1).max(50000),
  contentRichAr: z.string().min(1).max(50000),
  isActive: z.boolean(),
});

export async function savePage(formData: FormData): Promise<ContentResult> {
  let actor;
  try {
    actor = await requireAdminAction("content");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = pageSchema.safeParse({
    id: String(formData.get("id") ?? "") || undefined,
    slug: formData.get("slug"),
    title: formData.get("title"),
    titleAr: formData.get("titleAr"),
    contentRich: formData.get("contentRich"),
    contentRichAr: formData.get("contentRichAr"),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { ok: false, error: t.common.error };
  const input = parsed.data;

  // Admin-authored HTML — still strip active content defensively.
  if (/<script|javascript:|on\w+\s*=/i.test(input.contentRich + input.contentRichAr))
    return { ok: false, error: t.common.error };

  const clash = await db.page.findFirst({
    where: { slug: input.slug, NOT: input.id ? { id: input.id } : undefined },
    select: { id: true },
  });
  if (clash) return { ok: false, error: t.products.slugTaken };

  const { id, ...data } = input;
  if (id) {
    await db.page.update({ where: { id }, data });
    await audit(actor.userId, "page.update", "Page", id, { slug: input.slug });
  } else {
    const created = await db.page.create({ data });
    await audit(actor.userId, "page.create", "Page", created.id, { slug: input.slug });
  }
  revalidateContent(input.slug);
  return { ok: true, message: t.content.pageSaved };
}

export async function deletePage(formData: FormData): Promise<void> {
  const { userId } = await requireAdminAction("content");
  const id = String(formData.get("id") ?? "");
  const page = await db.page.findUnique({ where: { id } });
  if (!page) return;
  await db.page.delete({ where: { id } });
  await audit(userId, "page.delete", "Page", id, { slug: page.slug });
  revalidateContent(page.slug);
}

// -- nav & footer links ------------------------------------------------------

const linkSchema = z.object({
  label: z.string().trim().min(1).max(60),
  labelAr: z.string().trim().max(60),
  href: z.string().trim().min(1).max(300),
});

const linksSchema = z.object({
  navLinks: z.array(linkSchema).max(10),
  footerLinks: z.array(linkSchema).max(15),
});

export async function saveLinks(raw: unknown): Promise<ContentResult> {
  let actor;
  try {
    actor = await requireAdminAction("content");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = linksSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.common.error };

  await db.storeSettings.update({
    where: { id: 1 },
    data: { navLinks: parsed.data.navLinks, footerLinks: parsed.data.footerLinks },
  });
  await audit(actor.userId, "settings.links", "StoreSettings", "1", {
    nav: parsed.data.navLinks.length,
    footer: parsed.data.footerLinks.length,
  });
  revalidateContent();
  return { ok: true, message: t.content.linksSaved };
}
