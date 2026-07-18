import { requireUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { messages } from "@/lib/i18n";
import { AddressesClient } from "./addresses-client";

export const metadata = { title: messages.account.addresses };

export default async function AccountAddressesPage() {
  const session = await requireUser();
  const addresses = await db.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { label: "asc" }],
  });
  return (
    <AddressesClient
      addresses={addresses}
      t={{ ...messages.account, ...messages.checkout }}
    />
  );
}
