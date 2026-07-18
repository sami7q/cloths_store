import type { ReactNode } from "react";
import { SearchIcon, TruckIcon, UserIcon } from "./icons";

export type StoreHeaderProps = {
  /** Store logo (image or inline SVG) — from StoreSettings. */
  logo: ReactNode;
  homeHref?: string;
  homeLabel?: string;
  searchPlaceholder: string;
  searchLabel: string;
  /** GET target for the search form, e.g. "/search" (query lands in ?q=). */
  searchAction?: string;
  searchDefaultValue?: string;
  /** Hotline number — from StoreSettings; hidden when absent. */
  hotline?: string;
  accountLabel: string;
  accountHref?: string;
};

export function StoreHeader({
  logo,
  homeHref = "/",
  homeLabel = "Home",
  searchPlaceholder,
  searchLabel,
  searchAction = "/search",
  searchDefaultValue,
  hotline,
  accountLabel,
  accountHref = "#",
}: StoreHeaderProps) {
  return (
    <header className="bg-white py-[22px]">
      <div className="container-store flex flex-wrap items-center gap-x-8 gap-y-3.5 max-md:gap-x-4">
        <a href={homeHref} aria-label={homeLabel} className="shrink-0">
          {logo}
        </a>
        <form
          action={searchAction}
          role="search"
          className="relative min-w-0 flex-1 basis-64 max-md:order-3 max-md:basis-full"
        >
          <input
            type="search"
            name="q"
            defaultValue={searchDefaultValue}
            placeholder={searchPlaceholder}
            className="h-14 w-full rounded-[32px] border border-line bg-white pe-16 ps-[26px] text-base text-ink outline-none transition-colors placeholder:text-gray-4 focus:border-navy"
          />
          <button
            type="submit"
            aria-label={searchLabel}
            className="absolute end-1.5 top-1.5 flex size-11 items-center justify-center rounded-full bg-navy text-white"
          >
            <SearchIcon className="size-[18px]" />
          </button>
        </form>
        <div className="flex shrink-0 items-center gap-[22px]">
          {hotline ? (
            <a
              href={`tel:${hotline}`}
              className="flex items-center gap-2.5 text-[22px] font-extrabold tracking-[0.5px] text-ink max-md:text-[17px]"
            >
              <TruckIcon className="size-[30px]" />
              {hotline}
            </a>
          ) : null}
          <a href={accountHref} aria-label={accountLabel} className="text-ink">
            <UserIcon className="size-7" />
          </a>
        </div>
      </div>
    </header>
  );
}
