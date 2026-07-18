import { requireAdminModule } from "@/lib/auth-guards";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default async function Page() {
  const session = await requireAdminModule("staff");
  return <ModulePlaceholder module="staff" role={session.user.role} />;
}
