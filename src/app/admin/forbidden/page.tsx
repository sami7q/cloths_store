import Link from "next/link";
import { requireAdminModule } from "@/lib/auth-guards";
import { messages } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: messages.admin.forbiddenTitle };

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; l?: string }>;
}) {
  // Any admin-area role may see this page; it only names the denied module.
  await requireAdminModule("dashboard");
  const { m, l } = await searchParams;
  const t = messages.admin;

  return (
    <div className="mx-auto max-w-[480px] rounded-3xl border border-line bg-white p-8 text-center">
      <h1 className="font-heading text-3xl font-bold uppercase tracking-[1px] text-deal-red">
        {t.forbiddenTitle}
      </h1>
      <p className="mt-3 text-gray-6">{t.forbiddenBody}</p>
      {m ? (
        <p className="mt-4 flex items-center justify-center gap-2">
          <Badge tone="deal">{m}</Badge>
          {l ? <Badge tone="outline">{l}</Badge> : null}
        </p>
      ) : null}
      <p className="mt-6">
        <Link href="/admin" className="font-bold text-navy hover:underline">
          ← {t.backToDashboard}
        </Link>
      </p>
    </div>
  );
}
