"use client";

import { ChevronUpIcon } from "./icons";

export type ScrollTopButtonProps = {
  label?: string;
};

export function ScrollTopButton({ label = "Back to top" }: ScrollTopButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-[34px] end-[34px] z-[60] flex size-14 items-center justify-center rounded-full border border-line bg-white text-ink shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
    >
      <ChevronUpIcon className="size-5" />
    </button>
  );
}
