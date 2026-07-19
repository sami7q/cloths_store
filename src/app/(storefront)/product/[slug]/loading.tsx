import { Skeleton } from "@/components/ui/skeleton";

/** PDP skeleton: gallery + options column, mirroring the real two-col grid. */
export default function ProductLoading() {
  return (
    <div className="container-store pb-16 pt-6">
      <Skeleton className="mb-6 h-4 w-72" />
      <div className="grid grid-cols-[1.1fr_1fr] gap-10 max-lg:grid-cols-1">
        <div>
          <Skeleton className="aspect-[1/1.05] w-full rounded-[10px]" />
          <div className="mt-3 flex gap-3">
            <Skeleton className="size-20 rounded-lg" />
            <Skeleton className="size-20 rounded-lg" />
            <Skeleton className="size-20 rounded-lg" />
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-9 w-4/5" />
          <Skeleton className="h-6 w-2/5" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <div className="flex gap-2.5">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="size-9 rounded-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-11 w-14 rounded-[7px]" />
            <Skeleton className="h-11 w-14 rounded-[7px]" />
            <Skeleton className="h-11 w-14 rounded-[7px]" />
            <Skeleton className="h-11 w-14 rounded-[7px]" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-14 flex-1 rounded-full" />
            <Skeleton className="h-14 flex-1 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
