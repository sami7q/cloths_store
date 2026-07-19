export type PromoMarqueeProps = {
  /** Marquee messages — sourced from CMS (Banner placement MARQUEE). */
  items: string[];
};

export function PromoMarquee({ items }: PromoMarqueeProps) {
  if (items.length === 0) return null;
  // Content is rendered twice for a seamless -50% translate loop.
  const loop = [...items, ...items];
  return (
    <div className="group relative flex h-11 items-center overflow-hidden bg-navy text-white">
      <div className="flex animate-marquee whitespace-nowrap will-change-transform group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {loop.map((text, i) => (
          <span
            key={i}
            aria-hidden={i >= items.length}
            className="inline-flex items-center px-7 text-[15px] font-bold tracking-[0.2px]"
          >
            {text}
            <span className="ms-7 inline-block h-0.5 w-[120px] rounded-[2px] bg-white/85" />
          </span>
        ))}
      </div>
    </div>
  );
}
