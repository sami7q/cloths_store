import { messages } from "@/lib/i18n";
import { SplitHeading } from "@/components/store/split-heading";
import { WishlistClient } from "./wishlist-client";

export const metadata = { title: messages.account.wishlistTitle };

export default function WishlistPage() {
  return (
    <div className="container-store pb-4 pt-2">
      <SplitHeading left={messages.common.wishlist} right="" />
      <WishlistClient />
    </div>
  );
}
