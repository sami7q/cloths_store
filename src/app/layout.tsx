import type { Metadata } from "next";
import { Archivo, Cairo, Oswald } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-archivo",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["700", "900"],
  variable: "--font-cairo",
  display: "swap",
});

// Placeholder metadata — replaced by StoreSettings-driven metadata once the
// data layer exists (Phase 1+). Never hardcode merchant branding here.
export const metadata: Metadata = {
  title: "Storefront",
  description: "E-commerce storefront",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <body
        className={`${archivo.variable} ${oswald.variable} ${cairo.variable} font-body text-ink antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
