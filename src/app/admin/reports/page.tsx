import { requireAdminModule } from "@/lib/auth-guards";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default async function Page() {
  const session = await requireAdminModule("reports");
  return <ModulePlaceholder module="reports" role={session.user.role} />;
}
