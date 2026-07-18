import { requireUser } from "@/lib/auth-guards";
import { isAdminAreaRole } from "@/lib/permissions";
import { messages } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/store/signout-button";
import Link from "next/link";

export const metadata = { title: messages.account.title };

// Placeholder — the full account area (orders, addresses, profile) is Phase 5.
export default async function AccountPage() {
  const session = await requireUser();
  const t = messages.account;

  return (
    <main className="container-store py-16">
      <div className="mx-auto max-w-[560px] rounded-3xl border border-line bg-white p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold uppercase tracking-[1px]">{t.title}</h1>
            <p className="mt-2 text-gray-6">
              {t.greeting}, <span className="font-bold text-ink">{session.user.name}</span>
            </p>
          </div>
          <SignOutButton label={messages.auth.signOut} />
        </div>
        <dl className="mt-6 flex flex-col gap-3 border-t border-line pt-6 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-6">{t.email}</dt>
            <dd className="font-semibold">{session.user.email}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-gray-6">{t.role}</dt>
            <dd>
              <Badge tone="navy">{session.user.role}</Badge>
            </dd>
          </div>
        </dl>
        <p className="mt-6 text-sm text-gray-6">{t.overviewNote}</p>
        {isAdminAreaRole(session.user.role) ? (
          <p className="mt-4">
            <Link href="/admin" className="font-bold text-navy hover:underline">
              → {messages.admin.title}
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}
