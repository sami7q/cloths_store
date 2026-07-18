import type { ReactNode } from "react";

export type CategoryCardProps = {
  /** Line icon (SVG) — from Category.iconSvg. */
  icon: ReactNode;
  name: ReactNode;
  href?: string;
};

export function CategoryCard({ icon, name, href = "#" }: CategoryCardProps) {
  return (
    <a
      href={href}
      className="flex h-[104px] items-center rounded-[10px] border border-line bg-white px-2 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(22,41,78,0.10)]"
    >
      <span className="flex flex-1 items-center justify-center text-navy [&_svg]:h-14 [&_svg]:w-[84px] [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[2.6] [&_svg]:[stroke-linecap:round] [&_svg]:[stroke-linejoin:round]">
        {icon}
      </span>
      <span aria-hidden className="h-14 w-px bg-line" />
      <span className="flex-1 text-center text-[19px] font-bold leading-[1.15] text-ink">
        {name}
      </span>
    </a>
  );
}
