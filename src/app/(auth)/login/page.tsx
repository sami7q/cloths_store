import { messages } from "@/lib/i18n";
import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LoginForm } from "./login-form";

const googleEnabled = Boolean(process.env.GOOGLE_ID && process.env.GOOGLE_SECRET);

export const metadata = { title: messages.auth.loginTitle };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const t = messages.auth;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-bold uppercase tracking-[1px]">{t.loginTitle}</h1>
        <p className="mt-1 text-sm text-gray-6">{t.loginSubtitle}</p>
      </header>
      <LoginForm
        labels={{
          email: t.email,
          password: t.password,
          login: t.login,
          forgotPassword: t.forgotPassword,
          noAccount: t.noAccount,
          register: t.register,
        }}
        callbackUrl={callbackUrl}
      />
      {googleEnabled ? (
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/account" });
          }}
        >
          <Button type="submit" variant="outline" size="lg" className="w-full">
            {t.continueWithGoogle}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
