"use client";

import { useState } from "react";

export type SideOfferTabProps = {
  /** Offer text, e.g. "GET 5% OFF" — from CMS (Banner placement SIDE_TAB). */
  text: string;
  closeLabel?: string;
};

/** Fixed vertical tab on the inline-start edge; dismissible. */
export function SideOfferTab({ text, closeLabel = "Dismiss offer" }: SideOfferTabProps) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div className="fixed start-0 top-[42%] z-[60] rotate-180 rounded-e-md bg-navy-deep px-3 py-[22px] text-sm font-extrabold tracking-[2px] text-white shadow-[2px_2px_10px_rgba(0,0,0,0.2)] [writing-mode:vertical-rl]">
      {text}
      <button
        type="button"
        aria-label={closeLabel}
        onClick={() => setVisible(false)}
        className="absolute -end-2.5 -top-2.5 flex size-[22px] rotate-180 items-center justify-center rounded-full border border-line bg-white text-[11px] text-ink [writing-mode:horizontal-tb]"
      >
        ✕
      </button>
    </div>
  );
}
