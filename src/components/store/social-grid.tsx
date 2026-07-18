import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SocialGridTile = {
  imageUrl?: string;
  href?: string;
  label?: string;
  className?: string;
  style?: CSSProperties;
};

export type SocialGridProps = {
  /** Giant headline, e.g. "#MakeMoves" — from CMS. */
  title: string;
  /** Tag-us line; pass rich content (handle in <b>) — from CMS. */
  tagline?: ReactNode;
  tiles: SocialGridTile[];
};

export function SocialGrid({ title, tagline, tiles }: SocialGridProps) {
  return (
    <section className="mt-20">
      <div className="flex flex-wrap items-end justify-between gap-[30px]">
        <h2 className="text-[clamp(64px,9vw,132px)] font-extrabold leading-[0.95] tracking-[-3px]">
          {title}
        </h2>
        {tagline ? (
          <div className="pb-[18px] text-2xl font-bold max-md:text-lg [&_b]:font-extrabold">
            {tagline}
          </div>
        ) : null}
      </div>
      <div className="mt-11 grid grid-cols-6 gap-4 max-lg:grid-cols-3 max-md:grid-cols-2">
        {tiles.map((tile, i) => (
          <a
            key={i}
            href={tile.href ?? "#"}
            aria-label={tile.label}
            className={cn(
              "relative aspect-[5/8] overflow-hidden rounded bg-card transition-transform duration-300 hover:scale-[1.02] after:absolute after:inset-0 after:bg-[linear-gradient(180deg,transparent_55%,rgba(0,0,0,0.35))] after:content-['']",
              tile.className,
            )}
            style={{
              ...(tile.imageUrl
                ? {
                    backgroundImage: `url(${tile.imageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined),
              ...tile.style,
            }}
          />
        ))}
      </div>
    </section>
  );
}
