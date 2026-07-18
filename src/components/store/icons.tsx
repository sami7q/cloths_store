// Shared storefront chrome icons. Stroke/fill inherit currentColor so the
// consuming component controls color via text-* utilities.

type IconProps = { className?: string };

export function SearchIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}

export function TruckIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3 16V8a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v8" />
      <path d="M16 10h3l2 3v3h-2" />
      <circle cx="7" cy="17" r="1.8" />
      <circle cx="16" cy="17" r="1.8" />
      <path d="M3 16h18" />
    </svg>
  );
}

export function UserIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 5-5.5 8-5.5s6.5 1.5 8 5.5" />
    </svg>
  );
}

export function HeartIcon({
  className,
  filled = false,
}: IconProps & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.6}
      className={className}
      aria-hidden
    >
      <path d="M12 20s-7-4.6-9.3-8.6C.9 8 2.6 4.6 6 4.3c2-.2 3.6.8 4.6 2.3.4.6 1.4.6 1.8 0 1-1.5 2.6-2.5 4.6-2.3 3.4.3 5.1 3.7 3.3 7.1C19 15.4 12 20 12 20z" />
    </svg>
  );
}

export function BagIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M6 8h12l-1 12H7L6 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

export function CaretDownIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 10 6" fill="currentColor" className={className} aria-hidden>
      <path d="M0 0h10L5 6z" />
    </svg>
  );
}

export function ChevronUpIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M6 14l6-6 6 6" />
    </svg>
  );
}
