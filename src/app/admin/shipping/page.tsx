import { requireAdminModule } from "@/lib/auth-guards";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default async function Page() {
  const session = await requireAdminModule("shipping");
  return <ModulePlaceholder module="shipping" role={session.user.role} />;
}
