import { Skeleton } from "@/components/ui/skeleton";

/** Admin module skeleton: page title, toolbar, table rows. The shell
 * (sidebar/topbar) lives in the layout and stays interactive. */
export default function AdminLoading() {
  return (
    <div>
      <Skeleton className="mb-6 h-9 w-56" />
      <Skeleton className="mb-4 h-10 w-full max-w-[640px] rounded-full" />
      <div className="flex flex-col gap-px overflow-hidden rounded-2xl border border-line bg-white p-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="my-1.5 h-11 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
