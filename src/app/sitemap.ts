import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

function base(): string {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products, pages] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, select: { slug: true } }),
    db.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
    db.page.findMany({ where: { isActive: true }, select: { slug: true } }),
  ]);
  const url = (path: string) => `${base()}${path}`;
  return [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/search"), changeFrequency: "weekly", priority: 0.3 },
    ...categories.map((c) => ({
      url: url(`/category/${c.slug}`),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: url(`/product/${p.slug}`),
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...pages.map((p) => ({
      url: url(`/pages/${p.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
  ];
}
