import Link from "next/link";
import { auth } from "@/lib/auth";
import { messages } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/store/signout-button";

// Minimal admin chrome for Phase 2 role verification — the full shell
// (collapsible sidebar, global search, notifications) is Phase 6.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const t = messages.admin;

  return (
    <div className="min-h-screen bg-card">
      <header className="border-b border-line bg-white">
        <div className="container-store flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="font-heading text-xl font-bold uppercase tracking-[1px] text-navy">
              {t.title}
            </Link>
            {session?.user ? <Badge tone="navy">{session.user.role}</Badge> : null}
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-semibold text-gray-6 hover:text-navy">
              {t.storefront}
            </Link>
            <SignOutButton label={messages.auth.signOut} />
          </div>
        </div>
      </header>
      <main className="container-store py-10">{children}</main>
    </div>
  );
}
