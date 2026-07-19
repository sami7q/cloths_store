import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminModule } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { messages } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { PageHeader } from "@/components/admin/list-controls";
import { AssignmentClient, type AssignableProduct } from "./assignment-client";

const t = messages.admin;
export const metadata = { title: `${t.collections.manageProducts} — ${t.title}` };

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminModule("collections", "edit");
  const { id } = await params;
  const [collection, settings, products] = await Promise.all([
    db.collection.findUnique({
      where: { id },
      include: { products: { orderBy: { sortOrder: "asc" }, select: { productId: true } } },
    }),
    db.storeSettings.findUnique({ where: { id: 1 } }),
    db.product.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: { name: "asc" },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    }),
  ]);
  if (!collection) notFound();
  const currency = settings?.currency ?? "EGP";

  const catalog: AssignableProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: formatPrice(p.basePrice, currency),
    imageUrl: p.images[0]?.url ?? null,
    status: p.status,
  }));

  return (
    <div>
      <PageHeader title={`${collection.name} — ${t.collections.manageProducts}`}>
        <Link
          href="/admin/collections"
          className="inline-flex h-10 items-center rounded-full border border-line bg-white px-5 text-sm font-bold uppercase tracking-[0.5px] hover:border-navy"
        >
          ← {t.common.back}
        </Link>
      </PageHeader>
      <AssignmentClient
        collectionId={collection.id}
        assignedIds={collection.products.map((p) => p.productId)}
        catalog={catalog}
      />
    </div>
  );
}
