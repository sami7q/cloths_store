import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminModule } from "@/lib/auth-guards";
import { messages } from "@/lib/i18n";
import { getProductEditorData } from "@/server/admin/products-data";
import { archiveProduct, duplicateProduct } from "@/server/admin/products";
import { PageHeader, StatusPill } from "@/components/admin/list-controls";
import { ProductForm } from "./product-form";

const t = messages.admin;
export const metadata = { title: `${t.products.editProduct} — ${t.title}` };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminModule("products", "edit");
  const { id } = await params;
  const data = await getProductEditorData(id);
  if (!data) notFound();

  return (
    <div>
      <PageHeader title={data.product.name}>
        <StatusPill status={data.product.status} />
        <Link
          href={`/product/${data.product.slug}`}
          target="_blank"
          className="inline-flex h-10 items-center rounded-full border border-line bg-white px-5 text-sm font-bold uppercase tracking-[0.5px] hover:border-navy"
        >
          {t.storefront}
        </Link>
        <form action={duplicateProduct}>
          <input type="hidden" name="id" value={data.product.id} />
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-full border border-line bg-white px-5 text-sm font-bold uppercase tracking-[0.5px] hover:border-navy"
          >
            {t.common.duplicate}
          </button>
        </form>
        {data.product.status !== "ARCHIVED" && (
          <form action={archiveProduct}>
            <input type="hidden" name="id" value={data.product.id} />
            <button
              type="submit"
              className="inline-flex h-10 items-center rounded-full border border-line bg-white px-5 text-sm font-bold uppercase tracking-[0.5px] text-deal-red hover:border-deal-red"
            >
              {t.common.archive}
            </button>
          </form>
        )}
      </PageHeader>
      <ProductForm
        product={data.product}
        categories={data.categories}
        currency={data.currency}
        cardPercent={data.cardPercent}
        images={data.images}
        variants={data.variants}
      />
    </div>
  );
}
