"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type AuthFormState } from "@/server/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Labels = {
  email: string;
  sendResetLink: string;
  haveAccount: string;
  login: string;
};

export function ForgotForm({ labels }: { labels: Labels }) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(requestPasswordReset, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-ink">{labels.email}</span>
        <Input name="email" type="email" autoComplete="email" required />
      </label>
      {state.error ? (
        <p role="alert" className="rounded-xl bg-deal-bg px-4 py-3 text-sm font-semibold text-deal-red">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="rounded-xl bg-[#EEF4EC] px-4 py-3 text-sm font-semibold text-save-green">
          {state.success}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {labels.sendResetLink}
      </Button>
      <p className="text-center text-sm text-gray-6">
        {labels.haveAccount}{" "}
        <Link href="/login" className="font-bold text-navy hover:underline">
          {labels.login}
        </Link>
      </p>
    </form>
  );
}
