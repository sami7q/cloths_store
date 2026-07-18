import Link from "next/link";
import { messages } from "@/lib/i18n";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-card px-4 py-12">
      <div className="w-full max-w-[440px]">
        <div className="rounded-3xl border border-line bg-white p-8 shadow-[0_10px_40px_rgba(22,41,78,0.08)] sm:p-10">
          {children}
        </div>
        <p className="mt-6 text-center text-sm text-gray-6">
          <Link href="/" className="font-bold text-navy hover:underline">
            ← {messages.admin.storefront}
          </Link>
        </p>
      </div>
    </main>
  );
}
