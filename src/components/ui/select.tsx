import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "h-14 w-full appearance-none rounded-full border border-line bg-white px-6 text-base text-ink outline-none transition-colors focus:border-navy",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
