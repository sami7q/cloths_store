import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-14 w-full rounded-full border border-line bg-white px-6 text-base text-ink outline-none transition-colors placeholder:text-gray-4 focus:border-navy",
        className,
      )}
      {...props}
    />
  );
}
