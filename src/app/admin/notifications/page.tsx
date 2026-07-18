import { requireAdminModule } from "@/lib/auth-guards";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default async function Page() {
  const session = await requireAdminModule("notifications");
  return <ModulePlaceholder module="notifications" role={session.user.role} />;
}
