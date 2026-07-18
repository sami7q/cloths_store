import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const tones = {
  navy: "bg-navy text-white",
  deep: "bg-navy-deep text-white",
  save: "bg-save-green text-white",
  deal: "bg-deal-red text-white",
  neutral: "bg-[#F3F4F6] text-ink",
  outline: "border border-line bg-white text-ink",
} as const;

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: keyof typeof tones;
};

export function Badge({ tone = "navy", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-4 py-[7px] text-[13.5px] font-bold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
