import type { SVGProps } from "react";

/** Line icons for the admin shell — stroke currentColor, 24px grid. */

function base(props: SVGProps<SVGSVGElement>) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    width: 20,
    height: 20,
    "aria-hidden": true,
    ...props,
  };
}

export const AdminIcons = {
  dashboard: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <rect x="3" y="3" width="7.5" height="9" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="5.5" rx="1.5" />
      <rect x="13.5" y="12" width="7.5" height="9" rx="1.5" />
      <rect x="3" y="15.5" width="7.5" height="5.5" rx="1.5" />
    </svg>
  ),
  orders: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <path d="M6 2h12l1.5 4H4.5L6 2Z" />
      <path d="M4.5 6h15V20a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V6Z" />
      <path d="M9 10a3 3 0 0 0 6 0" />
    </svg>
  ),
  products: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <path d="M12 2 21 7v10l-9 5-9-5V7l9-5Z" />
      <path d="M3.5 7.5 12 12l8.5-4.5" />
      <path d="M12 12v9.5" />
    </svg>
  ),
  categories: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <path d="M4 4h7l2 3h7v13H4V4Z" />
    </svg>
  ),
  collections: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <path d="M17 13.5v7M13.5 17h7" />
    </svg>
  ),
  inventory: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <path d="M3 8h18v12H3V8Z" />
      <path d="M5 8V4h14v4" />
      <path d="M9 12h6" />
    </svg>
  ),
  discounts: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <path d="m5 19 14-14" />
      <circle cx="7.5" cy="7.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </svg>
  ),
  customers: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" />
      <path d="M16 5.5a3.5 3.5 0 0 1 0 6.5M18.5 20c-.35-2.1-1.3-3.8-2.7-4.8" />
    </svg>
  ),
  reviews: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <path d="m12 3 2.5 5.3 5.5.8-4 4 1 5.9-5-2.8-5 2.8 1-5.9-4-4 5.5-.8L12 3Z" />
    </svg>
  ),
  content: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9h10M7 13h10M7 17h6" />
    </svg>
  ),
  shipping: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <path d="M2 6h12v11H2V6Z" />
      <path d="M14 10h4l3 3v4h-7v-7Z" />
      <circle cx="6.5" cy="18.5" r="1.8" />
      <circle cx="17" cy="18.5" r="1.8" />
    </svg>
  ),
  payments: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M2.5 10h19" />
      <path d="M6.5 15h4" />
    </svg>
  ),
  staff: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <circle cx="12" cy="7.5" r="3.5" />
      <path d="M5 20.5c.9-3.8 3.7-6 7-6s6.1 2.2 7 6" />
      <path d="M17.5 3.8a3.5 3.5 0 0 1 0 7.4" />
    </svg>
  ),
  notifications: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <path d="M6 9.5a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  ),
  reports: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8 16v-5M12 16V7M16 16v-3M20 16V9" />
    </svg>
  ),
  settings: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.3 7.3 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.06-.4.1-.8.1-1.2Z" />
    </svg>
  ),
  search: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20.5 20.5-4-4" />
    </svg>
  ),
  bell: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <path d="M6 9.5a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  ),
  chevronLeft: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <path d="m14.5 6-6 6 6 6" />
    </svg>
  ),
  chevronRight: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <path d="m9.5 6 6 6-6 6" />
    </svg>
  ),
  external: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M19 14v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </svg>
  ),
  logout: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <path d="M9 4H5a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 5 20h4" />
      <path d="m15 8 4 4-4 4" />
      <path d="M19 12H9" />
    </svg>
  ),
  plus: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  trash: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6.5 7 8 21h8l1.5-14" />
    </svg>
  ),
  drag: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <circle cx="9" cy="6" r="1" fill="currentColor" />
      <circle cx="15" cy="6" r="1" fill="currentColor" />
      <circle cx="9" cy="12" r="1" fill="currentColor" />
      <circle cx="15" cy="12" r="1" fill="currentColor" />
      <circle cx="9" cy="18" r="1" fill="currentColor" />
      <circle cx="15" cy="18" r="1" fill="currentColor" />
    </svg>
  ),
  print: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}>
      <path d="M7 8V3h10v5" />
      <rect x="4" y="8" width="16" height="9" rx="1.5" />
      <path d="M7 14h10v7H7v-7Z" />
    </svg>
  ),
} as const;

export type AdminIconName = keyof typeof AdminIcons;
