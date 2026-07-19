import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton, SectionHeadingSkeleton } from "@/components/store/skeletons";

/** Storefront content skeleton (hero + section + card grid). Header, nav and
 * footer live in the layout and stay visible while this renders. */
export default function StorefrontLoading() {
  return (
    <div className="container-store pb-16 pt-6">
      <Skeleton className="h-[380px] w-full rounded-[10px] max-md:h-[240px]" />
      <SectionHeadingSkeleton className="mt-12" />
      <ProductGridSkeleton className="mt-7" />
    </div>
  );
}
