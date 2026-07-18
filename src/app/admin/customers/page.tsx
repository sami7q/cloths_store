import { requireAdminModule } from "@/lib/auth-guards";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default async function Page() {
  const session = await requireAdminModule("customers");
  return <ModulePlaceholder module="customers" role={session.user.role} />;
}
