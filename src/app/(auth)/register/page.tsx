import { messages } from "@/lib/i18n";
import { RegisterForm } from "./register-form";

export const metadata = { title: messages.auth.registerTitle };

export default function RegisterPage() {
  const t = messages.auth;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-bold uppercase tracking-[1px]">{t.registerTitle}</h1>
        <p className="mt-1 text-sm text-gray-6">{t.registerSubtitle}</p>
      </header>
      <RegisterForm
        labels={{
          name: t.name,
          email: t.email,
          password: t.password,
          confirmPassword: t.confirmPassword,
          register: t.register,
          haveAccount: t.haveAccount,
          login: t.login,
        }}
      />
    </div>
  );
}
