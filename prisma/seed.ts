/**
 * Seed — STORE-BUILD-PROMPT.md §4.
 * Deterministic (seeded RNG) so repeated runs produce the same catalog.
 * All content here is SAMPLE DATA a merchant replaces from the admin — the
 * codebase itself never depends on any of these strings.
 *
 * Run: pnpm prisma db seed
 */
import { PrismaClient, Prisma, Product } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "../src/lib/enums";

const db = new PrismaClient();

// --- deterministic RNG -----------------------------------------------------
let rngState = 20260718;
function rand(): number {
  // mulberry32
  rngState |= 0;
  rngState = (rngState + 0x6d2b79f5) | 0;
  let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rint = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const sample = <T,>(arr: T[], n: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  return out;
};
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

const PRODUCT_IMG = "/images/placeholder-product.svg";
const BANNER_IMG = "/images/placeholder-banner.svg";

// --- fixture data ----------------------------------------------------------

const icon = (paths: string) =>
  `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const CATEGORIES: { name: string; nameAr: string; slug: string; iconSvg: string }[] = [
  { name: "Slides", nameAr: "شباشب", slug: "slides", iconSvg: icon('<path d="M6 32c0-9 8-16 18-16s18 7 18 16v4H6z"/><path d="M14 24l8 8M26 22l8 8"/>') },
  { name: "Sandals", nameAr: "صنادل", slug: "sandals", iconSvg: icon('<path d="M8 34h32v4H8z"/><path d="M12 34c0-8 5-14 12-14s12 6 12 14"/><path d="M24 20v-8M18 16l6-4 6 4"/>') },
  { name: "Clogs", nameAr: "كلوغ", slug: "clogs", iconSvg: icon('<path d="M6 30c0-8 7-14 16-14 10 0 20 5 20 12v6H10z"/><circle cx="18" cy="24" r="1.5"/><circle cx="26" cy="22" r="1.5"/>') },
  { name: "Sneakers", nameAr: "أحذية رياضية", slug: "sneakers", iconSvg: icon('<path d="M4 32l4-12c8 2 12 4 18 2l14 6c3 1 4 4 4 6H4z"/><path d="M16 24l3 3M22 22l3 3"/>') },
  { name: "Loafers", nameAr: "أحذية كلاسيك", slug: "loafers", iconSvg: icon('<path d="M6 32c2-8 8-13 17-13 9 0 19 5 19 11v4H6z"/><path d="M18 24c3 2 8 2 11 0"/>') },
  { name: "Boots", nameAr: "أحذية بوت", slug: "boots", iconSvg: icon('<path d="M16 8h12v16c6 1 12 4 12 8v4H12V8z"/><path d="M16 16h12"/>') },
  { name: "Flip Flops", nameAr: "زنوبة", slug: "flip-flops", iconSvg: icon('<ellipse cx="24" cy="26" rx="12" ry="16"/><path d="M24 18v-4M18 22l6-8 6 8"/>') },
  { name: "Slippers", nameAr: "خفّافات", slug: "slippers", iconSvg: icon('<path d="M8 30c0-8 6-14 16-14s16 6 16 14v6H8z"/><path d="M16 26c4-4 12-4 16 0"/>') },
];

const COLORS: { name: string; hex: string }[] = [
  { name: "Black", hex: "#1A1A1A" },
  { name: "Navy", hex: "#16294E" },
  { name: "Sand", hex: "#C9B7A0" },
  { name: "Olive", hex: "#3E5233" },
  { name: "Coral", hex: "#E27D60" },
  { name: "Mist", hex: "#AFC1D0" },
  { name: "White", hex: "#F2F2EF" },
  { name: "Rose", hex: "#D98C9C" },
  { name: "Grey", hex: "#9CA3AF" },
  { name: "Teal", hex: "#2F6F6A" },
];

const MATERIALS = ["EVA Ultra-Light", "Croslite Foam", "Recycled Rubber", "Soft Knit Mesh", "Premium Leather", "Suede Finish"];

// 40 products distributed across the 8 categories. [en, ar]
const NAMES_BY_CATEGORY: Record<string, [string, string][]> = {
  slides: [
    ["BABUTCHA", "بابوتشا"], ["CALIDA-HELADO", "كاليدا هيلادو"], ["CALIDA-TRENZA", "كاليدا ترينزا"],
    ["CALIDA-VERANO", "كاليدا فيرانو"], ["MAREA CLOUD", "ماريا كلاود"], ["ONDA SLIDE", "أوندا سلايد"],
  ],
  sandals: [
    ["PLAYA STRAP", "بلايا ستراب"], ["DUNA CROSS", "دونا كروس"], ["SOLERA", "سوليرا"],
    ["VIENTO", "فيينتو"], ["ARENA LUX", "أرينا لوكس"], ["COSTA WRAP", "كوستا راب"],
  ],
  clogs: [
    ["NUBE CLOG", "نوبي كلوغ"], ["BOSQUE", "بوسكي"], ["ROCA PRO", "روكا برو"],
    ["JARDIN", "جاردان"], ["PUERTO", "بويرتو"],
  ],
  sneakers: [
    ["VELOZ KNIT", "فيلوز نِت"], ["CIUDAD RUNNER", "سيوداد رانر"], ["PISTA LOW", "بيستا لو"],
    ["RUMBO", "رومبو"], ["FARO FLEX", "فارو فلكس"],
  ],
  loafers: [
    ["SENDA LOAFER", "سيندا لوفر"], ["PATIO CLASSIC", "باتيو كلاسيك"], ["MADERA", "ماديرا"],
    ["CORTE SUEDE", "كورتي سويد"],
  ],
  boots: [
    ["MONTE BOOT", "مونتي بوت"], ["CUMBRE", "كومبري"], ["VALLE HIGH", "فالي هاي"],
    ["NIEVE WARM", "نييفي وورم"],
  ],
  "flip-flops": [
    ["ZENOBA CLASSIC", "زنوبة كلاسيك"], ["ZENOBA CHARM", "زنوبة تشارم"], ["OLA FLIP", "أولا فليب"],
    ["BRISA", "بريزا"], ["ISLA SOFT", "إيسلا سوفت"],
  ],
  slippers: [
    ["CASA PLUSH", "كازا بلَش"], ["SIESTA", "سييستا"], ["MANTA COZY", "مانتا كوزي"],
    ["HOGAR", "هوغار"], ["LUNA NIGHT", "لونا نايت"],
  ],
};

const ADULT_SIZES = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];
const KID_SIZES = ["26", "28", "30", "32", "34"];

const CUSTOMERS: [string, string][] = [
  ["Sara Mahmoud", "sara@example.test"], ["Omar Khaled", "omar@example.test"],
  ["Laila Hassan", "laila@example.test"], ["Youssef Adel", "youssef@example.test"],
  ["Nour Ibrahim", "nour@example.test"], ["Karim Fathy", "karim@example.test"],
  ["Mona Samir", "mona@example.test"], ["Hany Tarek", "hany@example.test"],
  ["Dina Ashraf", "dina@example.test"], ["Ali Mostafa", "ali@example.test"],
];

const CITIES = ["Cairo", "Giza", "Alexandria", "Mansoura", "Tanta"];

// --- main ------------------------------------------------------------------

async function main() {
  console.log("Seeding…");

  // wipe in FK-safe order (idempotent re-seed)
  await db.auditLog.deleteMany();
  await db.notification.deleteMany();
  await db.newsletterSub.deleteMany();
  await db.review.deleteMany();
  await db.orderStatusLog.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.wishlistItem.deleteMany();
  await db.collectionProduct.deleteMany();
  await db.collection.deleteMany();
  await db.productImage.deleteMany();
  await db.variant.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.address.deleteMany();
  await db.user.deleteMany();
  await db.coupon.deleteMany();
  await db.promoRule.deleteMany();
  await db.shippingZone.deleteMany();
  await db.banner.deleteMany();
  await db.page.deleteMany();
  await db.storeSettings.deleteMany();

  // -- store settings (singleton) --
  await db.storeSettings.create({
    data: {
      id: 1,
      name: "Comfy Steps",
      logoUrl: null, // merchant uploads from admin → falls back to text logo
      currency: "EGP",
      defaultLocale: "en",
      hotline: "16772",
      socialLinks: { facebook: "https://facebook.com/", instagram: "https://instagram.com/", tiktok: "https://tiktok.com/" },
      seoDefaults: { title: "Comfy Steps — Footwear Store", description: "Comfort with personality — slides, sandals and more." },
      codEnabled: true,
      codFee: 25,
    },
  });

  // -- users --
  const password = await bcrypt.hash("Admin123!", 10);
  const customerPassword = await bcrypt.hash("Customer123!", 10);

  const admin = await db.user.create({
    data: { name: "Store Admin", email: "admin@store.test", passwordHash: password, role: "ADMIN", phone: "+201000000001" },
  });
  const manager = await db.user.create({
    data: { name: "Mostafa Manager", email: "manager@store.test", passwordHash: password, role: "MANAGER", phone: "+201000000002" },
  });
  await db.user.create({
    data: { name: "Salma Staff", email: "staff@store.test", passwordHash: password, role: "STAFF", phone: "+201000000003" },
  });

  const customers = [];
  for (let i = 0; i < CUSTOMERS.length; i++) {
    const [name, email] = CUSTOMERS[i];
    const city = pick(CITIES);
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash: customerPassword,
        role: "CUSTOMER",
        phone: `+2010${String(10000000 + i * 111111).slice(0, 8)}`,
        createdAt: daysAgo(rint(5, 120)),
        addresses: {
          create: {
            label: "Home",
            country: "Egypt",
            city,
            area: pick(["Nasr City", "Maadi", "Dokki", "Zamalek", "Heliopolis"]),
            street: `${rint(1, 120)} ${pick(["El Tahrir St", "El Nasr Rd", "El Horreya Ave", "9th St"])}`,
            building: `Bldg ${rint(1, 40)}, Apt ${rint(1, 12)}`,
            phone: `+2011${String(20000000 + i * 222222).slice(0, 8)}`,
            isDefault: true,
          },
        },
      },
      include: { addresses: true },
    });
    customers.push(user);
  }

  // -- categories --
  const categories = [];
  for (let i = 0; i < CATEGORIES.length; i++) {
    categories.push(
      await db.category.create({
        data: { ...CATEGORIES[i], imageUrl: BANNER_IMG, sortOrder: i, isActive: true },
      }),
    );
  }

  // -- products + variants + images --
  const products: Product[] = [];
  let skuSeq = 1000;
  for (const cat of categories) {
    const names = NAMES_BY_CATEGORY[cat.slug];
    for (let i = 0; i < names.length; i++) {
      const [name, nameAr] = names[i];
      const slug = name.toLowerCase().replace(/\s+/g, "-");
      const base = rint(18, 49) * 50 - 1; // 899 … 2449
      const compareAt = Math.round(base * (1 + rint(20, 40) / 100));
      const cardPrice = Math.round(base * 0.85);
      const material = pick(MATERIALS);
      const colors = sample(COLORS, rint(3, 6));
      const sizes = cat.slug === "flip-flops" && i >= 3 ? KID_SIZES : sample(ADULT_SIZES, rint(5, 6)).sort();
      const sku = `P-${++skuSeq}`;

      const product = await db.product.create({
        data: {
          name,
          nameAr,
          slug,
          description: `${name} — everyday comfort in ${material.toLowerCase()}. Cushioned footbed, anti-slip sole, and a lightweight build made for long days.`,
          descriptionAr: `${nameAr} — راحة يومية بخامة ${material}. نعل داخلي مريح وقاعدة مانعة للانزلاق وتصميم خفيف يدوم طوال اليوم.`,
          material,
          categoryId: cat.id,
          brand: pick(["Comfy Steps", "Zenoba", "Marea"]),
          basePrice: base,
          compareAtPrice: compareAt,
          cardPrice,
          costPrice: Math.round(base * 0.55),
          sku,
          weight: rint(250, 900),
          tags: [cat.slug, material.split(" ")[0].toLowerCase(), pick(["summer", "comfort", "daily", "outdoor"])],
          status: "ACTIVE",
          isFeatured: rand() < 0.3,
          sortOrder: i,
          seoTitle: `${name} | Comfy Steps`,
          seoDescription: `Shop ${name} — ${material}, multiple colors and sizes.`,
          createdAt: daysAgo(rint(1, 100)),
          images: {
            create: colors.slice(0, 3).map((c, idx) => ({
              url: PRODUCT_IMG,
              alt: `${name} — ${c.name}`,
              sortOrder: idx,
              variantColorRef: c.name,
            })),
          },
          variants: {
            create: colors.flatMap((c, ci) =>
              sizes.map((size, si) => ({
                colorName: c.name,
                colorHex: c.hex,
                size,
                sku: `${sku}-${c.name.slice(0, 3).toUpperCase()}-${size}`,
                stock: rand() < 0.12 ? rint(0, 2) : rint(4, 25), // ~12% low/out of stock
                lowStockAt: 3,
                price: ci === 0 && si === 0 && rand() < 0.15 ? base + 100 : null,
              })),
            ),
          },
        },
      });
      products.push(product);
    }
  }

  // -- collections (power the homepage carousels) --
  const collectionDefs: { name: string; nameAr: string; slug: string; pickFn: () => typeof products }[] = [
    { name: "New Arrivals", nameAr: "وصل حديثًا", slug: "new-arrivals", pickFn: () => sample(products, 10) },
    { name: "Best Sellers", nameAr: "الأكثر مبيعًا", slug: "best-sellers", pickFn: () => sample(products, 10) },
    { name: "Popular for Her", nameAr: "الأشهر لها", slug: "popular-for-her", pickFn: () => sample(products, 8) },
    { name: "Popular for Him", nameAr: "الأشهر له", slug: "popular-for-him", pickFn: () => sample(products, 8) },
    { name: "For Kids", nameAr: "للأطفال", slug: "for-kids", pickFn: () => products.filter((p) => p.slug.startsWith("zenoba") || p.slug.includes("flip") || p.slug === "brisa" || p.slug === "isla-soft") },
    { name: "EVA-ULTRA", nameAr: "إيفا ألترا", slug: "eva-ultra", pickFn: () => products.filter((p) => p.material === "EVA Ultra-Light").slice(0, 8) },
  ];
  for (const def of collectionDefs) {
    const chosen = def.pickFn();
    await db.collection.create({
      data: {
        name: def.name,
        nameAr: def.nameAr,
        slug: def.slug,
        imageUrl: BANNER_IMG,
        products: { create: chosen.map((p, idx) => ({ productId: p.id, sortOrder: idx })) },
      },
    });
  }

  // -- promo rules (the four §3/§5 examples) --
  await db.promoRule.createMany({
    data: [
      {
        name: "Multi-buy: 2nd item -15%, 3rd item -30%",
        type: "BUY_X_GET_DISCOUNT",
        config: { tiers: [{ nth: 2, percentOff: 15 }, { nth: 3, percentOff: 30 }] },
        priority: 10,
      },
      {
        name: "3 EVA-ULTRA items for 3999",
        type: "BUNDLE_PRICE",
        config: { collectionSlug: "eva-ultra", quantity: 3, bundlePrice: 3999 },
        priority: 20,
      },
      {
        name: "Extra 15% off when paying by card",
        type: "CARD_EXTRA_PERCENT",
        config: { percentOff: 15 },
        priority: 30,
      },
      {
        name: "Free shipping over 800",
        type: "FREE_SHIPPING_OVER",
        config: { threshold: 800 },
        priority: 40,
      },
    ],
  });

  // -- coupons --
  await db.coupon.createMany({
    data: [
      { code: "WELCOME10", type: "PERCENT", value: 10, minSubtotal: null, maxUses: 1000, perUserLimit: 1, startsAt: daysAgo(30), endsAt: daysAgo(-335), appliesTo: "ALL", targetIds: [] },
      { code: "SAVE50", type: "FIXED", value: 50, minSubtotal: 500, maxUses: 500, perUserLimit: 2, startsAt: daysAgo(15), endsAt: daysAgo(-75), appliesTo: "ALL", targetIds: [] },
      { code: "SHIPFREE", type: "FREE_SHIPPING", value: 0, minSubtotal: 300, maxUses: null, perUserLimit: null, startsAt: daysAgo(60), endsAt: daysAgo(-120), appliesTo: "ALL", targetIds: [] },
    ],
  });

  // -- shipping zones --
  const zones = await Promise.all([
    db.shippingZone.create({
      data: { name: "Greater Cairo", countries: ["Egypt"], cities: ["Cairo", "Giza"], rate: 60, freeOver: 800, etaText: "1–2 business days" },
    }),
    db.shippingZone.create({
      data: { name: "Rest of Egypt", countries: ["Egypt"], cities: [], rate: 90, freeOver: 1200, etaText: "2–5 business days" },
    }),
  ]);

  // -- banners (every placement) --
  await db.banner.createMany({
    data: [
      // marquee
      { placement: "MARQUEE", title: "Free shipping on orders over 800 EGP", titleAr: "شحن مجاني للطلبات فوق ٨٠٠ جنيه", sortOrder: 0 },
      { placement: "MARQUEE", title: "Extra 15% off when you pay by card", titleAr: "خصم إضافي ١٥٪ عند الدفع بالبطاقة", sortOrder: 1 },
      { placement: "MARQUEE", title: "2nd item -15% · 3rd item -30%", titleAr: "القطعة الثانية -١٥٪ · الثالثة -٣٠٪", sortOrder: 2 },
      { placement: "MARQUEE", title: "New arrivals every week", titleAr: "وصولات جديدة كل أسبوع", sortOrder: 3 },
      // hero
      {
        placement: "HERO",
        title: "Comfort With Personality",
        titleAr: "شبشب زنوبا",
        subtitle: "Lightweight comfort with playful charms to match your vibe.",
        subtitleAr: "راحة خفيفة بلمسات مرحة تناسب أسلوبك.",
        imageUrl: BANNER_IMG,
        linkUrl: "/category/flip-flops",
        config: { badge: "New Arrivals", badgeAr: "وصل حديثًا" },
        sortOrder: 0,
      },
      // lifestyle
      { placement: "LIFESTYLE", title: "Slides Season", titleAr: "موسم الشباشب", imageUrl: BANNER_IMG, linkUrl: "/category/slides", sortOrder: 0 },
      { placement: "LIFESTYLE", title: "Beach Ready", titleAr: "جاهز للبحر", imageUrl: BANNER_IMG, linkUrl: "/category/sandals", sortOrder: 1 },
      { placement: "LIFESTYLE", title: "City Moves", titleAr: "حركة المدينة", imageUrl: BANNER_IMG, linkUrl: "/category/sneakers", sortOrder: 2 },
      { placement: "LIFESTYLE", title: "Home Comfort", titleAr: "راحة البيت", imageUrl: BANNER_IMG, linkUrl: "/category/slippers", sortOrder: 3 },
      // side tab
      { placement: "SIDE_TAB", title: "GET 5% OFF", titleAr: "خصم ٥٪", linkUrl: "/pages/offers", sortOrder: 0 },
      // social grid
      ...[0, 1, 2, 3, 4, 5].map((i) => ({
        placement: "SOCIAL_GRID" as const,
        title: "#MakeMoves",
        titleAr: "#تحرّك",
        imageUrl: BANNER_IMG,
        linkUrl: "https://instagram.com/",
        sortOrder: i,
      })),
    ],
  });

  // -- static pages --
  const pages: [string, string, string][] = [
    ["privacy-policy", "Privacy Policy", "سياسة الخصوصية"],
    ["shipping-policy", "Shipping Policy", "سياسة الشحن"],
    ["returns-exchanges", "Returns & Exchanges", "الاستبدال والاسترجاع"],
    ["about-us", "About Us", "من نحن"],
    ["terms", "Terms of Service", "شروط الاستخدام"],
  ];
  for (const [slug, title, titleAr] of pages) {
    await db.page.create({
      data: {
        slug,
        title,
        titleAr,
        contentRich: `<h2>${title}</h2><p>Sample content for the ${title.toLowerCase()} page. Edit this text from Admin → Content → Pages.</p>`,
        contentRichAr: `<h2>${titleAr}</h2><p>محتوى تجريبي لصفحة ${titleAr}. يمكن تعديل هذا النص من لوحة التحكم ← المحتوى ← الصفحات.</p>`,
      },
    });
  }

  // -- orders (25 across the last 90 days, mixed statuses) --
  const STATUS_FLOW: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];
  const STATUS_DIST: OrderStatus[] = [
    "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED",
    "SHIPPED", "SHIPPED", "SHIPPED", "PROCESSING", "PROCESSING", "PROCESSING", "CONFIRMED", "CONFIRMED", "PENDING", "PENDING",
    "PENDING", "CANCELLED", "CANCELLED", "RETURNED", "DELIVERED",
  ];

  const allVariants = await db.variant.findMany({ include: { product: true } });

  for (let i = 0; i < 25; i++) {
    const customer = customers[i % customers.length];
    const address = customer.addresses[0];
    const createdAt = daysAgo(rint(0, 90));
    const finalStatus = STATUS_DIST[i];
    const paymentMethod: PaymentMethod = rand() < 0.45 ? "CARD" : "COD";
    const zone = ["Cairo", "Giza"].includes(address.city) ? zones[0] : zones[1];

    const lineCount = rint(1, 4);
    const chosen = sample(allVariants, lineCount);
    const items = chosen.map((v) => {
      const price = Number(v.price ?? v.product.basePrice);
      const quantity = rint(1, 2);
      return { variant: v, price, quantity, total: price * quantity };
    });
    const subtotal = items.reduce((s, it) => s + it.total, 0);
    const discountTotal = rand() < 0.3 ? Math.round(subtotal * 0.1) : 0;
    const shippingTotal = zone.freeOver && subtotal >= Number(zone.freeOver) ? 0 : Number(zone.rate);
    const codFee = paymentMethod === "COD" ? 25 : null;
    const grandTotal = subtotal - discountTotal + shippingTotal + (codFee ?? 0);

    let paymentStatus: PaymentStatus;
    if (finalStatus === "CANCELLED") paymentStatus = paymentMethod === "CARD" ? "REFUNDED" : "PENDING";
    else if (finalStatus === "RETURNED") paymentStatus = "REFUNDED";
    else if (paymentMethod === "CARD") paymentStatus = "PAID";
    else paymentStatus = finalStatus === "DELIVERED" ? "PAID" : "PENDING";

    // build a plausible status trail ending at finalStatus
    const trail: OrderStatus[] =
      finalStatus === "CANCELLED"
        ? ["PENDING", "CANCELLED"]
        : finalStatus === "RETURNED"
          ? [...STATUS_FLOW, "RETURNED"]
          : STATUS_FLOW.slice(0, STATUS_FLOW.indexOf(finalStatus) + 1);

    await db.order.create({
      data: {
        orderNumber: `ORD-${1001 + i}`,
        userId: customer.id,
        subtotal,
        discountTotal,
        shippingTotal,
        codFee,
        grandTotal,
        paymentMethod,
        paymentStatus,
        status: finalStatus,
        couponCode: discountTotal > 0 ? "WELCOME10" : null,
        promoBreakdown: discountTotal > 0 ? [{ label: "WELCOME10 (-10%)", amount: discountTotal }] : Prisma.JsonNull,
        shippingAddress: {
          name: customer.name,
          phone: address.phone,
          country: address.country,
          city: address.city,
          area: address.area,
          street: address.street,
          building: address.building,
        },
        trackingNumber: ["SHIPPED", "DELIVERED", "RETURNED"].includes(finalStatus) ? `TRK${900000 + i * 137}` : null,
        createdAt,
        items: {
          create: items.map((it) => ({
            productId: it.variant.productId,
            variantId: it.variant.id,
            nameSnapshot: `${it.variant.product.name} — ${it.variant.colorName} / ${it.variant.size}`,
            imageSnapshot: PRODUCT_IMG,
            price: it.price,
            quantity: it.quantity,
            total: it.total,
          })),
        },
        statusHistory: {
          create: trail.map((to, idx) => ({
            fromStatus: idx === 0 ? null : trail[idx - 1],
            toStatus: to,
            byUserId: idx === 0 ? null : pick([admin.id, manager.id]),
            createdAt: new Date(createdAt.getTime() + idx * 6 * 3_600_000),
          })),
        },
      },
    });
  }

  // -- reviews (15) --
  const REVIEW_TEXTS: [number, string, string][] = [
    [5, "Insanely comfortable", "Wore them all day at work — zero fatigue. Sizing is spot on."],
    [5, "Best purchase this summer", "Light, soft and the color is exactly like the photos."],
    [4, "Great value", "Solid quality for the price. The sole grips well on wet tiles."],
    [4, "Comfy but runs big", "Order half a size down. Otherwise excellent."],
    [5, "My second pair", "Bought one for home and one for the beach. Recommended."],
    [3, "Decent", "Comfort is good but the strap loosened after a month."],
    [5, "Kids love them", "Took them to the pool all week, still like new."],
    [4, "Good everyday slide", "Cushioning is great, wish there were more colors."],
    [2, "Not for wide feet", "Felt tight on the sides even in my usual size."],
    [5, "Cloud feeling", "The EVA foam is unreal. Like walking on pillows."],
    [4, "Stylish and light", "Got compliments at the gym. Dries fast too."],
    [5, "Perfect gift", "Bought for my mom, she wears them non-stop."],
    [3, "Okay for the price", "Does the job. Packaging could be better."],
    [4, "Very satisfied", "Fast delivery and the fit is true to size."],
    [1, "Arrived scuffed", "Product came with a mark on the toe. Requested exchange."],
  ];
  const reviewProducts = sample(products, 15);
  for (let i = 0; i < 15; i++) {
    const [rating, title, body] = REVIEW_TEXTS[i];
    await db.review.create({
      data: {
        productId: reviewProducts[i].id,
        userId: customers[i % customers.length].id,
        rating,
        title,
        body,
        status: i < 11 ? "APPROVED" : i < 14 ? "PENDING" : "REJECTED",
        createdAt: daysAgo(rint(0, 80)),
      },
    });
  }

  // -- wishlist, newsletter, notifications, audit trail --
  for (const c of customers.slice(0, 6)) {
    for (const p of sample(products, rint(1, 4))) {
      await db.wishlistItem.create({ data: { userId: c.id, productId: p.id } });
    }
  }

  await db.newsletterSub.createMany({
    data: [
      { email: "sub1@example.test", source: "footer" },
      { email: "sub2@example.test", source: "footer" },
      { email: "sub3@example.test", source: "checkout" },
      { email: "sub4@example.test", source: "footer" },
      { email: "sub5@example.test", source: "popup" },
    ],
  });

  const lowStock = allVariants.filter((v) => v.stock <= v.lowStockAt).slice(0, 3);
  await db.notification.createMany({
    data: [
      ...lowStock.map((v) => ({
        type: "LOW_STOCK",
        title: "Low stock alert",
        body: `${v.product.name} (${v.colorName} / ${v.size}) is down to ${v.stock} units.`,
        link: "/admin/inventory",
      })),
      { type: "NEW_ORDER", title: "New order received", body: "Order ORD-1025 was placed.", link: "/admin/orders" },
      { type: "PENDING_REVIEW", title: "Reviews awaiting moderation", body: "3 reviews are pending approval.", link: "/admin/reviews" },
    ],
  });

  await db.auditLog.create({
    data: { userId: admin.id, action: "db.seed", entity: "StoreSettings", entityId: "1", diff: { note: "Initial seed data created" } },
  });

  const counts = {
    users: await db.user.count(),
    categories: await db.category.count(),
    products: await db.product.count(),
    variants: await db.variant.count(),
    collections: await db.collection.count(),
    orders: await db.order.count(),
    reviews: await db.review.count(),
    banners: await db.banner.count(),
    pages: await db.page.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
