import { requireAdminModule } from "@/lib/auth-guards";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { messages } from "@/lib/i18n";
import { PageHeader } from "@/components/admin/list-controls";
import { CollectionsClient, type CollectionRow } from "./collections-client";

const t = messages.admin;
export const metadata = { title: `${t.nav.collections} — ${t.title}` };

export default async function AdminCollectionsPage() {
  const session = await requireAdminModule("collections");
  const collections = await db.collection.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  const rows: CollectionRow[] = collections.map((c) => ({
    id: c.id,
    name: c.name,
    nameAr: c.nameAr,
    slug: c.slug,
    imageUrl: c.imageUrl,
    isActive: c.isActive,
    productCount: c._count.products,
  }));

  return (
    <div>
      <PageHeader title={t.collections.title} />
      <CollectionsClient rows={rows} canEdit={can(session.user.role, "collections", "edit")} />
    </div>
  );
}
