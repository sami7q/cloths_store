import { messages } from "@/lib/i18n";
import { getStoreSettings } from "@/server/storefront";
import { SplitHeading } from "@/components/store/split-heading";
import { CartClient } from "./cart-client";

export const metadata = { title: messages.cart.title };

export default async function CartPage() {
  const settings = await getStoreSettings();
  return (
    <div className="container-store pb-4 pt-2">
      <SplitHeading left={messages.common.cart} right="" />
      <CartClient t={messages.cart} currency={settings?.currency ?? "EGP"} />
    </div>
  );
}
