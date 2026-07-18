import { requireUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { messages } from "@/lib/i18n";
import { ProfileForms } from "./profile-forms";

export const metadata = { title: messages.account.profile };

export default async function AccountProfilePage() {
  const session = await requireUser();
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true, passwordHash: true },
  });
  if (!user) return null;

  return (
    <ProfileForms
      t={{ ...messages.account, name: messages.checkout.name, phone: messages.checkout.phone, email: messages.checkout.email }}
      user={{ name: user.name, email: user.email, phone: user.phone }}
      hasPassword={Boolean(user.passwordHash)}
    />
  );
}
