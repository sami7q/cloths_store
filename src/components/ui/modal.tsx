"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  closeLabel?: string;
  className?: string;
  children: ReactNode;
};

export function Modal({
  open,
  onClose,
  title,
  closeLabel = "Close",
  className,
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl",
          className,
        )}
      >
        <button
          type="button"
          aria-label={closeLabel}
          onClick={onClose}
          className="absolute end-4 top-4 flex size-8 items-center justify-center rounded-full border border-line bg-white text-sm text-ink transition-colors hover:bg-[#F3F4F6]"
        >
          ✕
        </button>
        {title ? (
          <h2 className="mb-4 pe-10 text-xl font-extrabold">{title}</h2>
        ) : null}
        {children}
      </div>
    </div>
  );
}
