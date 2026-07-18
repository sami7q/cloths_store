import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { db } from "@/lib/db";

const getPage = cache(async (slug: string) => {
  return db.page.findUnique({ where: { slug } });
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  return page ? { title: page.title } : {};
}

// CMS static pages (privacy, shipping, returns, …) — content from admin.
export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page || !page.isActive) notFound();

  return (
    <div className="container-store max-w-[860px] py-14">
      <h1 className="mb-8 font-heading text-4xl font-bold uppercase tracking-[1px]">{page.title}</h1>
      <div
        className="prose-store text-[17px] leading-relaxed text-gray-6 [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:uppercase [&_h2]:text-ink [&_p]:mb-4"
        dangerouslySetInnerHTML={{ __html: page.contentRich }}
      />
    </div>
  );
}
