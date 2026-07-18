import Link from "next/link";
import { requireUser } from "@/lib/auth-guards";
import { messages } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/store/signout-button";

const NAV = [
  { href: "/account", key: "overview" },
  { href: "/account/orders", key: "orders" },
  { href: "/account/addresses", key: "addresses" },
  { href: "/account/profile", key: "profile" },
] as const;

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  const t = messages.account;

  return (
    <div className="container-store py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold uppercase tracking-[1px]">{t.overview}</h1>
          <p className="mt-1 text-gray-6">
            <span className="font-bold text-ink">{session.user.name}</span>{" "}
            <Badge tone="navy">{session.user.role}</Badge>
          </p>
        </div>
        <SignOutButton label={messages.auth.signOut} />
      </div>
      <div className="grid grid-cols-[220px_1fr] gap-8 max-md:grid-cols-1">
        <nav className="flex h-fit flex-col gap-1 rounded-[10px] border border-line bg-white p-3 max-md:flex-row max-md:overflow-x-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-4 py-2.5 text-[15px] font-bold text-ink hover:bg-card"
            >
              {t[item.key]}
            </Link>
          ))}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
