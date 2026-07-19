import { cn } from "@/lib/utils";
import { BagIcon, CaretDownIcon, HeartIcon } from "./icons";

export type MainNavLink = {
  label: string;
  href: string;
  hasChildren?: boolean;
  active?: boolean;
};

export type MainNavProps = {
  /** Primary links — from the admin Navigation menu editor. */
  links: MainNavLink[];
  secondaryLinks?: { label: string; href: string }[];
  wishlistCount: number;
  wishlistHref?: string;
  wishlistLabel: string;
  cartCount: number;
  /** Pre-formatted cart total, e.g. "0 EGP" (currency from StoreSettings). */
  cartTotalLabel: string;
  cartLabel: string;
  cartHref?: string;
};

export function MainNav({
  links,
  secondaryLinks,
  wishlistCount,
  wishlistHref = "#",
  wishlistLabel,
  cartCount,
  cartTotalLabel,
  cartLabel,
  cartHref = "#",
}: MainNavProps) {
  return (
    <nav className="sticky top-0 z-50 border-y border-line bg-white">
      <div className="container-store flex h-[76px] items-center gap-2">
        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {links.map((link) => (
            <a
              key={`${link.href}-${link.label}`}
              href={link.href}
              aria-current={link.active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-1.5 whitespace-nowrap rounded-md px-3.5 py-2.5 text-[15.5px] font-bold uppercase tracking-[0.4px] text-ink transition-colors hover:bg-[#F3F4F6]",
                link.active &&
                  "after:absolute after:inset-x-3.5 after:bottom-0.5 after:h-[3px] after:rounded-[2px] after:bg-navy after:content-['']",
              )}
            >
              {link.label}
              {link.hasChildren ? (
                <CaretDownIcon className="mt-0.5 w-[9px]" />
              ) : null}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-5">
          {secondaryLinks?.map((link) => (
            <a
              key={`${link.href}-${link.label}`}
              href={link.href}
              className="px-1.5 py-2.5 text-[15.5px] font-bold uppercase tracking-[0.4px] text-ink max-md:hidden"
            >
              {link.label}
            </a>
          ))}
          <a
            href={wishlistHref}
            aria-label={wishlistLabel}
            className="flex items-center gap-1.5 font-bold text-ink"
          >
            <HeartIcon className="size-[26px]" />
            <span>{wishlistCount}</span>
          </a>
          <a
            href={cartHref}
            aria-label={cartLabel}
            className="relative flex items-center gap-3 rounded-[34px] bg-navy py-3 pe-[26px] ps-4 text-[17px] font-extrabold text-white"
          >
            <span className="flex size-[38px] items-center justify-center rounded-full bg-white text-navy">
              <BagIcon className="size-[18px]" />
            </span>
            {cartTotalLabel}
            <span className="absolute -top-1.5 end-0 flex size-[22px] items-center justify-center rounded-full border-2 border-white bg-navy-deep text-[11px] font-extrabold">
              {cartCount}
            </span>
          </a>
        </div>
      </div>
    </nav>
  );
}
