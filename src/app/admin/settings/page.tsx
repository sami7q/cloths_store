import { requireAdminModule } from "@/lib/auth-guards";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default async function Page() {
  const session = await requireAdminModule("settings");
  return <ModulePlaceholder module="settings" role={session.user.role} />;
}
