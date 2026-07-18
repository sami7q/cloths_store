"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register, type AuthFormState } from "@/server/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Labels = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  register: string;
  haveAccount: string;
  login: string;
};

export function RegisterForm({ labels }: { labels: Labels }) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(register, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-ink">{labels.name}</span>
        <Input name="name" autoComplete="name" required minLength={2} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-ink">{labels.email}</span>
        <Input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-ink">{labels.password}</span>
        <Input name="password" type="password" autoComplete="new-password" required minLength={8} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-ink">{labels.confirmPassword}</span>
        <Input name="confirmPassword" type="password" autoComplete="new-password" required />
      </label>
      {state.error ? (
        <p role="alert" className="rounded-xl bg-deal-bg px-4 py-3 text-sm font-semibold text-deal-red">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {labels.register}
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
