// DEV-ONLY dummy assets for the styleguide, copied from zee-clone.html.
// Real logos, product images, and category icons come from admin uploads —
// nothing in this file may be imported outside /dev.

export function DummyLogo({ fill = "#111" }: { fill?: string }) {
  return (
    <svg viewBox="0 0 120 60" className="h-[52px] w-auto" aria-hidden>
      <path
        d="M6 38 C 30 8, 58 4, 86 12 C 70 14, 52 22, 44 30 C 62 26, 84 24, 112 30 C 84 34, 56 44, 34 54 C 40 46, 44 40, 46 36 C 32 40, 16 40, 6 38 Z"
        fill={fill}
      />
    </svg>
  );
}

export function DummyShoe({
  upper = "#D8C6A8",
  accent,
}: {
  upper?: string;
  accent?: string;
}) {
  return (
    <svg
      viewBox="0 0 220 140"
      className="w-[78%] drop-shadow-[0_14px_10px_rgba(0,0,0,0.14)]"
      aria-hidden
    >
      <path
        d="M18 108 C 18 100, 26 96, 40 96 L 176 96 C 196 96, 206 100, 206 108 L 206 114 C 206 119, 200 122, 190 122 L 30 122 C 22 122, 18 118, 18 114 Z"
        fill="#2A2A2A"
      />
      <path
        d="M30 96 C 30 92, 34 90, 42 90 L 178 90 C 192 90, 200 92, 200 96 L 28 96 Z"
        fill="#C89B62"
      />
      <path
        d="M42 90 C 50 50, 100 38, 128 48 C 148 55, 154 72, 152 90 Z"
        fill={upper}
      />
      {accent ? (
        <rect
          x="96"
          y="52"
          width="16"
          height="11"
          rx="2.5"
          fill="none"
          stroke={accent}
          strokeWidth="3"
        />
      ) : null}
    </svg>
  );
}

export function DummySandal({
  base,
  strap,
}: {
  base: string;
  strap: string;
}) {
  return (
    <svg viewBox="0 0 120 76" className="h-[76px] w-[120px]" aria-hidden>
      <ellipse cx="60" cy="58" rx="46" ry="14" fill={base} />
      <path
        d="M60 18 C 60 38, 40 44, 30 54 M60 18 C 60 38, 80 44, 90 54"
        stroke={strap}
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* Category line icons (stroke set by CategoryCard). */

export function IconLoafers() {
  return (
    <svg viewBox="0 0 84 56" aria-hidden>
      <path d="M10 40 C 10 26, 26 16, 44 16 C 62 16, 76 24, 76 34 L 76 40 C 76 43, 73 45, 70 45 L 16 45 C 12 45, 10 43, 10 40 Z" />
      <path d="M34 16 C 36 22, 50 22, 52 16" />
    </svg>
  );
}

export function IconSneakers() {
  return (
    <svg viewBox="0 0 84 56" aria-hidden>
      <path d="M8 42 C 8 30, 20 18, 34 18 L 40 26 L 70 32 C 75 33, 78 36, 78 40 L 78 44 L 8 44 Z" />
      <path d="M40 26 L 48 22 M46 28 L 54 24 M52 30 L 60 26" />
    </svg>
  );
}

export function IconBoots() {
  return (
    <svg viewBox="0 0 84 56" aria-hidden>
      <path d="M14 46 L 14 22 C 14 14, 20 10, 26 10 L 34 10 C 40 10, 44 14, 44 22 L 44 46 Z" />
      <path d="M44 40 L 68 40 C 74 40, 78 42, 78 46 L 14 46" />
    </svg>
  );
}

export function IconClogs() {
  return (
    <svg viewBox="0 0 84 56" aria-hidden>
      <path d="M10 40 C 10 26, 24 16, 42 16 C 60 16, 74 24, 74 36 L 74 42 C 74 45, 71 46, 68 46 L 16 46 C 12 46, 10 44, 10 40 Z" />
      <rect x="34" y="20" width="12" height="8" rx="2" />
    </svg>
  );
}

export function IconFlipFlops() {
  return (
    <svg viewBox="0 0 84 56" aria-hidden>
      <path d="M8 44 C 8 40, 12 38, 20 38 L 64 38 C 72 38, 78 40, 78 44 L 78 46 L 8 46 Z" />
      <path d="M28 38 C 40 22, 56 26, 62 38" />
    </svg>
  );
}

/* Social icons for the footer demo. */

export function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M14 8h3V4h-3c-2.8 0-5 2.2-5 5v3H6v4h3v8h4v-8h3l1-4h-4V9c0-.6.4-1 1-1z" />
    </svg>
  );
}

export function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2.5c-2.6 0-2.9 0-3.9.06-1 .05-1.7.21-2.3.45a4.6 4.6 0 0 0-1.7 1.1 4.6 4.6 0 0 0-1.1 1.7c-.24.6-.4 1.3-.45 2.3C2.5 9.1 2.5 9.4 2.5 12s0 2.9.06 3.9c.05 1 .21 1.7.45 2.3.25.64.58 1.18 1.1 1.7.52.52 1.06.85 1.7 1.1.6.24 1.3.4 2.3.45 1 .06 1.3.06 3.9.06s2.9 0 3.9-.06c1-.05 1.7-.21 2.3-.45a4.6 4.6 0 0 0 1.7-1.1 4.6 4.6 0 0 0 1.1-1.7c.24-.6.4-1.3.45-2.3.06-1 .06-1.3.06-3.9s0-2.9-.06-3.9c-.05-1-.21-1.7-.45-2.3a4.6 4.6 0 0 0-1.1-1.7 4.6 4.6 0 0 0-1.7-1.1c-.6-.24-1.3-.4-2.3-.45-1-.06-1.3-.06-3.9-.06zm0 1.7c2.5 0 2.8 0 3.8.06.92.04 1.42.2 1.75.32.44.17.75.38 1.08.7.33.33.54.64.7 1.08.13.33.28.83.32 1.75.06 1 .06 1.3.06 3.8s0 2.8-.06 3.8c-.04.92-.2 1.42-.32 1.75-.17.44-.38.75-.7 1.08a2.9 2.9 0 0 1-1.08.7c-.33.13-.83.28-1.75.32-1 .06-1.3.06-3.8.06s-2.8 0-3.8-.06c-.92-.04-1.42-.2-1.75-.32a2.9 2.9 0 0 1-1.08-.7 2.9 2.9 0 0 1-.7-1.08c-.13-.33-.28-.83-.32-1.75-.06-1-.06-1.3-.06-3.8s0-2.8.06-3.8c.04-.92.2-1.42.32-1.75.17-.44.38-.75.7-1.08.33-.33.64-.54 1.08-.7.33-.13.83-.28 1.75-.32 1-.06 1.3-.06 3.8-.06zm0 2.9a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8zm0 8.1a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zm6.2-8.3a1.14 1.14 0 1 1-2.3 0 1.14 1.14 0 0 1 2.3 0z" />
    </svg>
  );
}

export function IconTikTok() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M16.6 3c.3 1.7 1.4 3.1 3.4 3.4v3.1c-1.3 0-2.5-.4-3.4-1v6.6c0 3.4-2.5 5.9-5.8 5.9A5.6 5.6 0 0 1 5 15.4c0-3.2 2.6-5.7 6-5.5v3.2c-1.6-.3-3 .8-3 2.3 0 1.4 1.1 2.5 2.6 2.5 1.6 0 2.8-1.2 2.8-3V3h3.2z" />
    </svg>
  );
}

export function DummyPaymentBadges() {
  return (
    <div className="flex flex-wrap items-center gap-3.5">
      <span aria-label="Mastercard" className="flex h-[34px] w-[52px] items-center">
        <svg viewBox="0 0 52 34" className="h-full w-full" aria-hidden>
          <circle cx="20" cy="17" r="12" fill="#EB001B" />
          <circle cx="32" cy="17" r="12" fill="#F79E1B" opacity=".9" />
        </svg>
      </span>
      <span className="flex h-[34px] items-center rounded-md bg-white px-3 text-lg font-extrabold italic text-[#1A1F71]">
        VISA
      </span>
      <span className="flex h-[34px] items-center rounded-lg bg-[#D42B2B] px-2.5 text-center text-[11px] font-extrabold uppercase leading-[1.1] text-white">
        Cash on
        <br />
        Delivery
      </span>
      <span className="flex h-[34px] items-center rounded-lg bg-[#E0457B] px-3 text-base font-extrabold text-white">
        sympl.
      </span>
      <span className="flex h-[34px] items-center rounded-md bg-white px-3 text-base font-extrabold text-black">
         Pay
      </span>
      <span className="flex h-[34px] items-center rounded-2xl bg-white px-3.5 text-base font-extrabold text-[#2B3A8C]">
        valU
      </span>
    </div>
  );
}
