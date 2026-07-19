import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton } from "@/components/store/skeletons";

/** PLP skeleton: title, filter sidebar, product grid. */
export default function CategoryLoading() {
  return (
    <div className="container-store pb-16 pt-2">
      <Skeleton className="mb-6 mt-4 h-9 w-64" />
      <div className="grid grid-cols-[260px_1fr] items-start gap-8 max-lg:grid-cols-1">
        <div className="flex flex-col gap-3 max-lg:hidden">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-32 w-full rounded-[10px]" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-40 w-full rounded-[10px]" />
        </div>
        <ProductGridSkeleton count={9} className="grid-cols-3 max-md:grid-cols-2" />
      </div>
    </div>
  );
}
