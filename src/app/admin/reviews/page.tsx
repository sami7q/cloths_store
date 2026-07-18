import { requireAdminModule } from "@/lib/auth-guards";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default async function Page() {
  const session = await requireAdminModule("reviews");
  return <ModulePlaceholder module="reviews" role={session.user.role} />;
}
