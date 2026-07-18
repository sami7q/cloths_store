import { requireAdminModule } from "@/lib/auth-guards";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default async function Page() {
  const session = await requireAdminModule("discounts");
  return <ModulePlaceholder module="discounts" role={session.user.role} />;
}
