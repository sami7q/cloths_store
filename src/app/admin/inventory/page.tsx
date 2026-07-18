import { requireAdminModule } from "@/lib/auth-guards";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default async function Page() {
  const session = await requireAdminModule("inventory");
  return <ModulePlaceholder module="inventory" role={session.user.role} />;
}
