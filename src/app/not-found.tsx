import Link from "next/link";
import { messages } from "@/lib/i18n";

export default function NotFound() {
  const t = messages.notFound;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-card px-6 text-center">
      <p className="font-heading text-[120px] font-bold leading-none text-navy">404</p>
      <h1 className="font-heading text-3xl font-bold uppercase tracking-[1px]">{t.title}</h1>
      <p className="text-gray-6">{t.body}</p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-navy px-8 py-3 font-extrabold uppercase tracking-[0.5px] text-white transition-colors hover:bg-navy-deep"
      >
        {t.backHome}
      </Link>
    </main>
  );
}
