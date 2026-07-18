import type { ReactNode } from "react";

export type FooterLink = { label: string; href: string };

export type FooterColumn = { heading: string; links: FooterLink[] };

export type DarkFooterProps = {
  aboutHeading: string;
  aboutText: string;
  socialHeading?: string;
  socials?: { label: string; href: string; icon: ReactNode }[];
  /** Link columns — from the admin Footer links editor. */
  columns: FooterColumn[];
  newsletterNote?: string;
  newsletterPlaceholder?: string;
  newsletterButtonLabel?: string;
  /** Bottom-row copyright line — from StoreSettings. */
  copyright: ReactNode;
  /** Oval logo mark — from StoreSettings. */
  logo?: ReactNode;
  /** Payment method badges row. */
  payments?: ReactNode;
};

export function DarkFooter({
  aboutHeading,
  aboutText,
  socialHeading,
  socials,
  columns,
  newsletterNote,
  newsletterPlaceholder,
  newsletterButtonLabel,
  copyright,
  logo,
  payments,
}: DarkFooterProps) {
  return (
    <footer className="mt-[90px] bg-black pb-9 pt-[72px] text-white">
      <div className="container-store grid grid-cols-[2.1fr_1fr_1fr_1.5fr] gap-14 max-lg:grid-cols-2 max-md:grid-cols-1 max-md:gap-10">
        <div>
          <h4 className="mb-[26px] text-[27px] font-bold tracking-[0.2px]">
            {aboutHeading}
          </h4>
          <p className="max-w-[560px] text-[17px] font-medium leading-[1.65]">
            {aboutText}
          </p>
          {socials && socials.length > 0 ? (
            <>
              {socialHeading ? (
                <div className="mb-[22px] mt-[46px] text-[27px] font-bold">
                  {socialHeading}
                </div>
              ) : null}
              <div className="flex gap-4">
                {socials.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="flex size-[46px] items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-[1.08] [&_svg]:size-[22px] [&_svg]:fill-current"
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </>
          ) : null}
        </div>

        {columns.map((column, i) => {
          const isLast = i === columns.length - 1;
          return (
            <div key={column.heading}>
              <h4 className="mb-[26px] text-[27px] font-bold tracking-[0.2px]">
                {column.heading}
              </h4>
              <ul>
                {column.links.map((link) => (
                  <li key={`${link.href}-${link.label}`} className="mb-5">
                    <a
                      href={link.href}
                      className="text-lg font-semibold transition-opacity hover:opacity-70"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
              {isLast && newsletterNote ? (
                <>
                  <p className="mt-14 text-[17px] font-semibold leading-normal">
                    {newsletterNote}
                  </p>
                  <form className="mt-[22px] flex gap-3">
                    <input
                      type="email"
                      placeholder={newsletterPlaceholder}
                      className="h-14 min-w-0 flex-1 rounded-[30px] border-none bg-white px-[26px] text-base text-ink outline-none placeholder:text-gray-4"
                    />
                    <button
                      type="submit"
                      className="h-14 rounded-[30px] bg-navy px-[34px] text-[15px] font-extrabold uppercase tracking-[0.5px] text-white"
                    >
                      {newsletterButtonLabel}
                    </button>
                  </form>
                </>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="container-store mt-20 flex flex-wrap items-center justify-between gap-[30px] max-md:justify-center max-md:text-center">
        <div className="text-[15px] font-semibold uppercase tracking-[2.5px] [&_b]:font-extrabold">
          {copyright}
        </div>
        {logo}
        {payments}
      </div>
    </footer>
  );
}
