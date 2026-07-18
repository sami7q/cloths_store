"use client";

import { useActionState } from "react";
import Link from "next/link";
import { authenticate, type AuthFormState } from "@/server/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Labels = {
  email: string;
  password: string;
  login: string;
  forgotPassword: string;
  noAccount: string;
  register: string;
};

export function LoginForm({ labels, callbackUrl }: { labels: Labels; callbackUrl?: string }) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(authenticate, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {callbackUrl ? <input type="hidden" name="callbackUrl" value={callbackUrl} /> : null}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-ink">{labels.email}</span>
        <Input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-ink">{labels.password}</span>
        <Input name="password" type="password" autoComplete="current-password" required />
      </label>
      {state.error ? (
        <p role="alert" className="rounded-xl bg-deal-bg px-4 py-3 text-sm font-semibold text-deal-red">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {labels.login}
      </Button>
      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="font-semibold text-gray-6 hover:text-navy">
          {labels.forgotPassword}
        </Link>
        <span className="text-gray-6">
          {labels.noAccount}{" "}
          <Link href="/register" className="font-bold text-navy hover:underline">
            {labels.register}
          </Link>
        </span>
      </div>
    </form>
  );
}
