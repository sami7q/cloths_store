import Link from "next/link";

// Placeholder — the CMS-driven homepage lands in Phase 3.
export default function HomePage() {
  return (
    <main className="container-store flex min-h-screen flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="font-heading text-4xl font-bold uppercase tracking-[1px]">
        Storefront
      </h1>
      <p className="text-gray-6">
        The homepage will be wired to CMS data in Phase 3.
      </p>
      <Link
        href="/dev/styleguide"
        className="rounded-full bg-navy px-8 py-3 font-extrabold uppercase tracking-[0.5px] text-white transition-colors hover:bg-navy-deep"
      >
        View dev styleguide
      </Link>
    </main>
  );
}
