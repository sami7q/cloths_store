import { messages } from "@/lib/i18n";
import { getCheckoutContext } from "@/server/cart";
import { SplitHeading } from "@/components/store/split-heading";
import { CheckoutClient } from "./checkout-client";

export const metadata = { title: messages.checkout.title };

export default async function CheckoutPage() {
  const ctx = await getCheckoutContext();
  return (
    <div className="container-store pb-4 pt-2">
      <SplitHeading left={messages.checkout.title} right="" />
      <CheckoutClient t={messages.checkout} tc={messages.cart} ctx={ctx} />
    </div>
  );
}
