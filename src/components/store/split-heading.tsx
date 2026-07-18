import { cn } from "@/lib/utils";

export type SplitHeadingProps = {
  left: string;
  right: string;
  className?: string;
};

/** `WORD ——rule—— WORD` section title (Oswald, uppercase). */
export function SplitHeading({ left, right, className }: SplitHeadingProps) {
  return (
    <h2 className={cn("mb-[30px] mt-[54px] flex items-center gap-6", className)}>
      <span className="whitespace-nowrap font-heading text-[44px] font-bold uppercase tracking-[1px] text-ink max-md:text-[30px]">
        {left}
      </span>
      <span aria-hidden className="h-0.5 flex-1 bg-ink" />
      <span className="whitespace-nowrap font-heading text-[44px] font-bold uppercase tracking-[1px] text-ink max-md:text-[30px]">
        {right}
      </span>
    </h2>
  );
}
