import { requireAdminModule } from "@/lib/auth-guards";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default async function Page() {
  const session = await requireAdminModule("payments");
  return <ModulePlaceholder module="payments" role={session.user.role} />;
}
