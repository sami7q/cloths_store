import { messages } from "@/lib/i18n";
import { ForgotForm } from "./forgot-form";

export const metadata = { title: messages.auth.forgotTitle };

export default function ForgotPasswordPage() {
  const t = messages.auth;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-bold uppercase tracking-[1px]">{t.forgotTitle}</h1>
        <p className="mt-1 text-sm text-gray-6">{t.forgotSubtitle}</p>
      </header>
      <ForgotForm
        labels={{
          email: t.email,
          sendResetLink: t.sendResetLink,
          haveAccount: t.haveAccount,
          login: t.login,
        }}
      />
    </div>
  );
}
