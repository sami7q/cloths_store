import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryCard } from "@/components/store/category-card";
import { DarkFooter } from "@/components/store/dark-footer";
import { HeroBanner, HeroSideItem } from "@/components/store/hero-banner";
import { LifestyleCard } from "@/components/store/lifestyle-card";
import { MainNav } from "@/components/store/main-nav";
import { ProductCard } from "@/components/store/product-card";
import { PromoMarquee } from "@/components/store/promo-marquee";
import { ScrollTopButton } from "@/components/store/scroll-top-button";
import { SideOfferTab } from "@/components/store/side-offer-tab";
import { SocialGrid } from "@/components/store/social-grid";
import { SplitHeading } from "@/components/store/split-heading";
import { StoreHeader } from "@/components/store/store-header";
import { ModalDemo } from "./modal-demo";
import {
  DummyLogo,
  DummyPaymentBadges,
  DummySandal,
  DummyShoe,
  IconBoots,
  IconClogs,
  IconFacebook,
  IconFlipFlops,
  IconInstagram,
  IconLoafers,
  IconSneakers,
  IconTikTok,
} from "./placeholders";

export const metadata = { title: "Dev styleguide" };

// ---------------------------------------------------------------------------
// DEV STYLEGUIDE — every value below is dummy data standing in for CMS/DB
// content. Compare side-by-side with zee-clone.html at 1440px and 390px.
// ---------------------------------------------------------------------------

const tokens = [
  { name: "navy", value: "#16294E", varName: "--navy" },
  { name: "navy-deep", value: "#0F1E3C", varName: "--navy-deep" },
  { name: "ink", value: "#1A1A1A", varName: "--ink" },
  { name: "gray-6", value: "#6B7280", varName: "--gray-6" },
  { name: "gray-4", value: "#9CA3AF", varName: "--gray-4" },
  { name: "line", value: "#E5E7EB", varName: "--line" },
  { name: "card-bg", value: "#F7F7F5", varName: "--card-bg" },
  { name: "deal-red", value: "#8B1F2F", varName: "--deal-red" },
  { name: "deal-bg", value: "#FBF3F4", varName: "--deal-bg" },
  { name: "save-green", value: "#3E5233", varName: "--save-green" },
];

const marqueeItems = [
  "2nd item -15%  |  3rd item -30%  |  Free Shipping 800+ EGP  |  +15% with Card",
  "Get 3 Classics for 3999 EGP ✨",
  "Get 3 Zanooba for 1199 EGP ✨",
  "Any 3 EVA Pieces for only 999 EGP ✨",
];

const navLinks = [
  { label: "Home", href: "#", active: true },
  { label: "New Arrivals", href: "#" },
  { label: "Women", href: "#", hasChildren: true },
  { label: "Men", href: "#", hasChildren: true },
  { label: "Kids", href: "#", hasChildren: true },
  { label: "Collection", href: "#", hasChildren: true },
  { label: "Sale", href: "#" },
];

const payNote = (
  <>
    Pay with card &nbsp;·&nbsp; <b>15% off</b> &nbsp;·&nbsp; <b>Free shipping</b>
  </>
);

const heroGradient = {
  background: `radial-gradient(ellipse 90% 70% at 75% 100%, #DDD3C4 0%, transparent 55%),
    radial-gradient(ellipse 60% 80% at 10% 20%, #1E3B23 0%, transparent 70%),
    radial-gradient(ellipse 70% 90% at 95% 10%, #2C5233 0%, transparent 65%),
    linear-gradient(135deg, #28472B 0%, #3E6B41 45%, #6E8F5E 75%, #C9BFA8 100%)`,
};

function SgSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-10">
      <h2 className="mb-6 text-sm font-bold uppercase tracking-[3px] text-gray-6">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <div className="pb-10">
      <div className="bg-navy-deep py-3 text-center text-sm font-bold uppercase tracking-[2px] text-white">
        Dev styleguide — dummy data only, not a real page
      </div>

      <main className="container-store">
        <SgSection title="Theme tokens">
          <div className="grid grid-cols-5 gap-4 max-md:grid-cols-2">
            {tokens.map((token) => (
              <div key={token.name} className="rounded-[10px] border border-line p-3">
                <div
                  className="h-16 rounded-md border border-line"
                  style={{ background: token.value }}
                />
                <div className="mt-2 text-sm font-bold">{token.varName}</div>
                <div className="text-xs text-gray-6">{token.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 space-y-2">
            <p className="font-body text-xl">
              Archivo — body / UI <b>bold</b>{" "}
              <span className="font-extrabold">extrabold</span>
            </p>
            <p className="font-heading text-2xl font-bold uppercase tracking-[1px]">
              Oswald — section headings
            </p>
            <p dir="rtl" lang="ar" className="font-arabic text-3xl font-black">
              القاهرة — عرض عربي
            </p>
          </div>
        </SgSection>

        <SgSection title="UI primitives">
          <div className="flex flex-wrap items-center gap-4">
            <Button>Primary</Button>
            <Button variant="dark">Dark</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
            <ModalDemo />
          </div>
          <div className="mt-6 grid max-w-2xl grid-cols-2 gap-4 max-md:grid-cols-1">
            <Input placeholder="Input — what are you looking for?" />
            <Select defaultValue="">
              <option value="" disabled>
                Select — sort by
              </option>
              <option value="new">Newest</option>
              <option value="price">Price</option>
            </Select>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Badge>navy</Badge>
            <Badge tone="deep">deep</Badge>
            <Badge tone="save">SAVE -22%</Badge>
            <Badge tone="deal">BEST DEAL</Badge>
            <Badge tone="neutral">neutral</Badge>
            <Badge tone="outline">outline</Badge>
          </div>
          <div className="mt-6 flex max-w-md flex-col gap-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-6 w-1/3" />
          </div>
        </SgSection>
      </main>

      <SgSection title="PromoMarquee">
        <PromoMarquee items={marqueeItems} />
      </SgSection>

      <SgSection title="StoreHeader + MainNav">
        <StoreHeader
          logo={<DummyLogo />}
          searchPlaceholder="What are you looking for?"
          searchLabel="Search"
          hotline="16772"
          accountLabel="Account"
        />
        <MainNav
          links={navLinks}
          secondaryLinks={[
            { label: "About Us", href: "#" },
            { label: "Contact", href: "#" },
          ]}
          wishlistCount={0}
          wishlistLabel="Wishlist"
          cartCount={0}
          cartTotalLabel="0 EGP"
          cartLabel="Cart"
        />
      </SgSection>

      <main className="container-store">
        <SgSection title="HeroBanner + side variants">
          <div className="grid grid-cols-[1fr_280px] gap-5 max-lg:grid-cols-1">
            <HeroBanner
              style={heroGradient}
              title={
                <div
                  dir="rtl"
                  lang="ar"
                  className="font-arabic text-[88px] font-black leading-none text-white [text-shadow:0_4px_30px_rgba(0,0,0,0.25)] max-md:text-[54px]"
                >
                  شبشب زنوبا
                </div>
              }
              subtitle="Comfort With Personality"
              badge="New Arrivals"
              caption="Lightweight comfort with playful charms to match your vibe."
            />
            <aside className="flex flex-col justify-between py-2 max-lg:flex-row">
              <HeroSideItem
                media={<DummySandal base="#E8DBC0" strap="#DECBA4" />}
                name="Sand"
                type="EVA · Ultra"
              />
              <HeroSideItem
                media={<DummySandal base="#1E2A4A" strap="#152039" />}
                name="Navy"
                type="EVA · Ultra"
              />
              <HeroSideItem
                media={<DummySandal base="#C77964" strap="#B0604C" />}
                name="Coral"
                type="EVA · Ultra"
              />
              <HeroSideItem
                media={<DummySandal base="#EDEDEA" strap="#D8D8D4" />}
                name="Mist"
                type="EVA · Ultra"
              />
            </aside>
          </div>
        </SgSection>

        <SgSection title="SplitHeading + CategoryCard">
          <SplitHeading left="Shop By" right="Category" className="mt-0" />
          <div className="grid grid-cols-5 gap-5 max-lg:grid-cols-3 max-md:grid-cols-2">
            <CategoryCard icon={<IconLoafers />} name="Loafers" />
            <CategoryCard icon={<IconSneakers />} name="Sneakers" />
            <CategoryCard icon={<IconBoots />} name="Boots" />
            <CategoryCard icon={<IconClogs />} name="Clogs" />
            <CategoryCard
              icon={<IconFlipFlops />}
              name={
                <>
                  Flip -<br />
                  Flops
                </>
              }
            />
          </div>
        </SgSection>

        <SgSection title="LifestyleCard">
          <div className="grid grid-cols-4 gap-[22px] max-lg:grid-cols-2 max-md:grid-cols-1">
            <LifestyleCard
              title={
                <>
                  Made For
                  <br />
                  Real Moments
                </>
              }
              style={{
                background:
                  "linear-gradient(160deg,#3C5B33 0%,#5C7A45 50%,#8AA061 100%)",
              }}
            />
            <LifestyleCard
              title={
                <>
                  Designed
                  <br />
                  To Feel Right
                </>
              }
              style={{
                background:
                  "linear-gradient(165deg,#7A6A55 0%,#A08B6E 55%,#C9B394 100%)",
              }}
            />
            <LifestyleCard
              title={
                <>
                  The Beauty
                  <br />
                  Of Slowing Down
                </>
              }
              style={{
                background:
                  "linear-gradient(170deg,#7FA9C9 0%,#A9C4D8 45%,#D9CDB2 100%)",
              }}
            />
            <LifestyleCard
              dark
              title={
                <>
                  Where Comfort
                  <br />
                  Meets Character
                </>
              }
              style={{
                background:
                  "linear-gradient(165deg,#E3D3B5 0%,#EFE2C8 50%,#F5EBD6 100%)",
              }}
            />
          </div>
        </SgSection>

        <SgSection title="ProductCard">
          <SplitHeading left="New" right="Arrivals" className="mt-0" />
          <div className="grid grid-cols-4 gap-6 max-lg:grid-cols-3 max-md:grid-cols-2 max-md:gap-4">
            <ProductCard
              name="BABUTCHA"
              material="Natural Leather"
              price="1,690 EGP"
              cardPrice="1,437 EGP"
              cardPriceTag="BEST DEAL"
              payNote={payNote}
              media={<DummyShoe upper="#D8C6A8" />}
              addToCartLabel="Add to cart"
              swatches={[
                { hex: "#151515", name: "Black" },
                { hex: "#1E2A4A", name: "Navy" },
                { hex: "#8A5A2B", name: "Tan" },
                { hex: "#6B7A3A", name: "Olive" },
              ]}
            />
            <ProductCard
              name="CALIDA-HELADO"
              material="Natural Leather"
              price="1,990 EGP"
              oldPrice="2,990 EGP"
              cardPrice="1,692 EGP"
              cardPriceTag="BEST DEAL"
              saveLabel="SAVE -33%"
              payNote={payNote}
              media={<DummyShoe upper="#9A5B2E" accent="#5A4630" />}
              addToCartLabel="Add to cart"
              swatches={[
                { hex: "#9A5B2E", name: "Brown" },
                { hex: "#585858", name: "Gray" },
                { hex: "#2A57C4", name: "Blue" },
                { hex: "#DCC9A6", name: "Sand" },
              ]}
            />
            <ProductCard
              name="CALIDA-TRENZA"
              material="Natural Leather"
              price="1,890 EGP"
              cardPrice="1,607 EGP"
              cardPriceTag="BEST DEAL"
              payNote={payNote}
              media={<DummyShoe upper="#4A5A3A" accent="#2E3A26" />}
              addToCartLabel="Add to cart"
              swatches={[
                { hex: "#E4D2AE", name: "Sand" },
                { hex: "#151515", name: "Black" },
                { hex: "#4A5A3A", name: "Olive" },
                { hex: "#1E2A4A", name: "Navy" },
              ]}
              extraSwatchCount={3}
            />
            <ProductCard
              name="CALIDA-VERANO – BLACK"
              material="Natural Leather"
              price="1,800 EGP"
              oldPrice="2,100 EGP"
              cardPrice="1,530 EGP"
              cardPriceTag="BEST DEAL"
              saveLabel="SAVE -14%"
              payNote={payNote}
              media={<DummyShoe upper="#181818" accent="#4A4A4A" />}
              addToCartLabel="Add to cart"
              sizes={["36", "37", "38", "39"]}
              extraSizeCount={3}
            />
          </div>
        </SgSection>

        <SgSection title="SocialGrid">
          <SocialGrid
            title="#MakeMoves"
            tagline={
              <>
                Tag us on social <b>@store_handle</b> to share your story!
              </>
            }
            tiles={[
              { style: { background: "linear-gradient(160deg,#5A4E44 0%,#8A7A66 60%,#B5A48C 100%)" } },
              { style: { background: "linear-gradient(160deg,#7A5A3A 0%,#A8825A 55%,#D0AC7E 100%)" } },
              { style: { background: "linear-gradient(165deg,#8FA8B8 0%,#C2A98E 55%,#E2CBA8 100%)" } },
              { style: { background: "radial-gradient(circle at 30% 30%,#C463A8 0%,transparent 30%),radial-gradient(circle at 70% 50%,#4A7AC4 0%,transparent 30%),radial-gradient(circle at 45% 75%,#C4A044 0%,transparent 32%),linear-gradient(160deg,#6E5A7A,#9A8AA8)" } },
              { style: { background: "linear-gradient(165deg,#2E7A72 0%,#48A896 60%,#7AC4B0 100%)" } },
              { style: { background: "linear-gradient(165deg,#3A3A42 0%,#6A6A78 55%,#A0A0AC 100%)" } },
            ]}
          />
        </SgSection>
      </main>

      <SgSection title="DarkFooter">
        <DarkFooter
          aboutHeading="About Store"
          aboutText="Footwear built around the way our feet connect us to the world — every step grounded in comfort, ease, character, flexibility and the freedom to express what's possible in our lives."
          socialHeading="Social Links:"
          socials={[
            { label: "Facebook", href: "#", icon: <IconFacebook /> },
            { label: "Instagram", href: "#", icon: <IconInstagram /> },
            { label: "TikTok", href: "#", icon: <IconTikTok /> },
          ]}
          columns={[
            {
              heading: "Categories",
              links: [
                { label: "Men", href: "#" },
                { label: "Women", href: "#" },
                { label: "Kids", href: "#" },
                { label: "New Arrivals", href: "#" },
                { label: "Sales", href: "#" },
              ],
            },
            {
              heading: "Useful Links",
              links: [
                { label: "About Us", href: "#" },
                { label: "Contact Us", href: "#" },
                { label: "Orders", href: "#" },
                { label: "My Account", href: "#" },
              ],
            },
            {
              heading: "Policies",
              links: [
                { label: "Privacy Policy", href: "#" },
                { label: "Shipping Policy", href: "#" },
                { label: "Return & Exchange", href: "#" },
              ],
            },
          ]}
          newsletterNote="Join the list for early access to new drops & exclusive offers."
          newsletterPlaceholder="Your email address"
          newsletterButtonLabel="Sign Up"
          copyright={
            <>
              © 2026 <b>STORE</b>
              <span className="mx-3 inline-block size-1.5 rounded-full bg-white align-middle" />
              Crafted by <b>Studio</b>
            </>
          }
          logo={
            <div className="flex items-center gap-2.5 rounded-[50%/46%] bg-white px-10 py-3.5">
              <span className="font-arabic text-[38px] font-black leading-none text-black">
                زي
              </span>
              <span className="text-[40px] font-extrabold leading-none tracking-[-1px] text-black">
                zee
              </span>
            </div>
          }
          payments={<DummyPaymentBadges />}
        />
      </SgSection>

      <SideOfferTab text="GET 5% OFF" />
      <ScrollTopButton />
    </div>
  );
}
