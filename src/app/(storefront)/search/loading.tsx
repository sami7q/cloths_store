import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton } from "@/components/store/skeletons";

export default function SearchLoading() {
  return (
    <div className="container-store pb-16 pt-2">
      <Skeleton className="mb-6 mt-4 h-9 w-72" />
      <ProductGridSkeleton />
    </div>
  );
}
