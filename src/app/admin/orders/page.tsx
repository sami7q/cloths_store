import { requireAdminModule } from "@/lib/auth-guards";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default async function Page() {
  const session = await requireAdminModule("orders");
  return <ModulePlaceholder module="orders" role={session.user.role} />;
}
