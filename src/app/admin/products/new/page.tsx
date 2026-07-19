import { requireAdminModule } from "@/lib/auth-guards";
import { messages } from "@/lib/i18n";
import { db } from "@/lib/db";
import { getCategoriesForSelect } from "@/server/admin/products-data";
import { PageHeader } from "@/components/admin/list-controls";
import { ProductForm } from "../[id]/product-form";

const t = messages.admin;
export const metadata = { title: `${t.products.newProduct} — ${t.title}` };

export default async function NewProductPage() {
  await requireAdminModule("products", "edit");
  const [categories, settings] = await Promise.all([
    getCategoriesForSelect(),
    db.storeSettings.findUnique({ where: { id: 1 } }),
  ]);
  return (
    <div>
      <PageHeader title={t.products.newProduct} />
      <ProductForm
        product={null}
        categories={categories}
        currency={settings?.currency ?? "EGP"}
        cardPercent={null}
        images={[]}
        variants={[]}
      />
    </div>
  );
}
