import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Mirrors ProductCard proportions: media area, name, subtitle, price box. */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-[1/1.05] w-full rounded-[10px]" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3.5 w-1/2" />
      <Skeleton className="h-16 w-full rounded-lg" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-4 gap-6 max-lg:grid-cols-3 max-md:grid-cols-2", className)}>
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** SplitHeading placeholder: word — rule — word. */
export function SectionHeadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-px flex-1" />
      <Skeleton className="h-8 w-32" />
    </div>
  );
}

/** Two-column line-items + sticky summary shape shared by cart and checkout. */
export function CartLayoutSkeleton() {
  return (
    <div className="grid grid-cols-[1fr_360px] items-start gap-8 max-lg:grid-cols-1">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-32 w-full rounded-[10px]" />
        <Skeleton className="h-32 w-full rounded-[10px]" />
      </div>
      <Skeleton className="h-80 rounded-[10px]" />
    </div>
  );
}
