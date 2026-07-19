import { Skeleton } from "@/components/ui/skeleton";

/** Account area skeleton (covers overview, orders, addresses, profile). */
export default function AccountLoading() {
  return (
    <div className="container-store pb-16 pt-6">
      <Skeleton className="mb-8 h-9 w-56" />
      <div className="grid grid-cols-[220px_1fr] items-start gap-8 max-lg:grid-cols-1">
        <div className="flex flex-col gap-2 max-lg:hidden">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-28 w-full rounded-[10px]" />
          <Skeleton className="h-28 w-full rounded-[10px]" />
          <Skeleton className="h-28 w-full rounded-[10px]" />
        </div>
      </div>
    </div>
  );
}
