import { requireAdminModule } from "@/lib/auth-guards";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default async function Page() {
  const session = await requireAdminModule("collections");
  return <ModulePlaceholder module="collections" role={session.user.role} />;
}
