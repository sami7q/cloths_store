import { requireAdminModule } from "@/lib/auth-guards";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { messages } from "@/lib/i18n";
import { PageHeader } from "@/components/admin/list-controls";
import { CategoriesClient, type CategoryNode } from "./categories-client";

const t = messages.admin;
export const metadata = { title: `${t.nav.categories} — ${t.title}` };

export default async function AdminCategoriesPage() {
  const session = await requireAdminModule("categories");
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  const toNode = (c: (typeof categories)[number]): CategoryNode => ({
    id: c.id,
    name: c.name,
    nameAr: c.nameAr,
    slug: c.slug,
    iconSvg: c.iconSvg,
    imageUrl: c.imageUrl,
    parentId: c.parentId,
    isActive: c.isActive,
    productCount: c._count.products,
    children: categories.filter((x) => x.parentId === c.id).map(toNode),
  });
  const tree = categories.filter((c) => !c.parentId).map(toNode);

  return (
    <div>
      <PageHeader title={t.categories.title} />
      <CategoriesClient tree={tree} canEdit={can(session.user.role, "categories", "edit")} />
    </div>
  );
}
