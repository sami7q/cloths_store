import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type LifestyleCardProps = {
  title: ReactNode;
  href?: string;
  /** Banner image — from Banner placement LIFESTYLE. */
  imageUrl?: string;
  /** Dark title variant for light imagery. */
  dark?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function LifestyleCard({
  title,
  href = "#",
  imageUrl,
  dark = false,
  className,
  style,
}: LifestyleCardProps) {
  return (
    <a
      href={href}
      className={cn(
        "relative flex aspect-[3/4.2] items-start overflow-hidden rounded-md bg-card px-[26px] py-[34px] after:absolute after:inset-0 after:bg-[radial-gradient(ellipse_120%_60%_at_50%_120%,rgba(0,0,0,0.28),transparent_60%)] after:content-['']",
        className,
      )}
      style={{
        ...(imageUrl
          ? {
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined),
        ...style,
      }}
    >
      <h3
        className={cn(
          "relative z-[2] w-full text-center text-[30px] font-semibold leading-[1.2]",
          dark
            ? "text-[#1E2A3A]"
            : "text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.35)]",
        )}
      >
        {title}
      </h3>
    </a>
  );
}
