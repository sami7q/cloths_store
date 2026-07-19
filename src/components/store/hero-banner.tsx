import type { CSSProperties, ReactNode } from "react";
import { SmartImage } from "@/components/ui/smart-image";
import { cn } from "@/lib/utils";

export type HeroBannerProps = {
  /** Headline — pass font-arabic styling from the caller for Arabic display. */
  title: ReactNode;
  subtitle?: string;
  /** Badge pill text, e.g. "New Arrivals" — from CMS. */
  badge?: string;
  caption?: string;
  /** Banner image — from Banner placement HERO. */
  imageUrl?: string;
  /** Decorative layer (leaves, logo swoosh, ...) rendered behind content. */
  decor?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function HeroBanner({
  title,
  subtitle,
  badge,
  caption,
  imageUrl,
  decor,
  className,
  style,
}: HeroBannerProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-[560px] flex-col justify-center overflow-hidden rounded-lg bg-card p-[60px] max-md:min-h-[440px] max-md:p-8",
        className,
      )}
      style={style}
    >
      {imageUrl ? (
        <SmartImage src={imageUrl} alt="" fill priority sizes="100vw" className="object-cover" />
      ) : null}
      {decor}
      <div className="relative z-[2]">
        {title}
        {subtitle ? (
          <div className="mt-[18px] text-[34px] font-semibold tracking-[0.3px] text-[#F2F0E8] [text-shadow:0_2px_16px_rgba(0,0,0,0.3)] max-md:text-2xl">
            {subtitle}
          </div>
        ) : null}
      </div>
      <div className="relative z-[2] mt-auto">
        {badge ? (
          <span className="mb-3.5 inline-block rounded-3xl bg-[rgba(120,40,60,0.85)] px-[22px] py-2 text-base font-bold text-white">
            {badge}
          </span>
        ) : null}
        {caption ? (
          <p className="max-w-[420px] text-[17px] leading-normal text-[#EFEDE4] [text-shadow:0_1px_8px_rgba(0,0,0,0.4)]">
            {caption}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export type HeroSideItemProps = {
  /** Variant thumbnail (image / SVG). */
  media: ReactNode;
  name: string;
  type?: string;
  href?: string;
};

/** Featured-variant entry for the hero side column. */
export function HeroSideItem({ media, name, type, href = "#" }: HeroSideItemProps) {
  return (
    <a href={href} className="flex flex-col items-center gap-0.5 py-2.5">
      {media}
      <span className="mt-0.5 text-[19px] font-extrabold text-ink">{name}</span>
      {type ? (
        <span className="text-[11.5px] font-semibold tracking-[0.4px] text-gray-6">
          {type}
        </span>
      ) : null}
    </a>
  );
}
