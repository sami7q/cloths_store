"use client";

import { useActionState } from "react";
import { changePassword, updateProfile } from "@/server/account";
import type { AuthFormState } from "@/server/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Strings = typeof import("../../../../../messages/en.json")["account"] & {
  name: string;
  phone: string;
  email: string;
};

function Feedback({ state }: { state: AuthFormState }) {
  if (state.error) return <p className="text-sm font-semibold text-deal-red">{state.error}</p>;
  if (state.success) return <p className="text-sm font-semibold text-save-green">{state.success}</p>;
  return null;
}

export function ProfileForms({
  t,
  user,
  hasPassword,
}: {
  t: Strings;
  user: { name: string; email: string; phone: string | null };
  hasPassword: boolean;
}) {
  const [profileState, profileAction, profilePending] = useActionState<AuthFormState, FormData>(updateProfile, {});
  const [passwordState, passwordAction, passwordPending] = useActionState<AuthFormState, FormData>(changePassword, {});

  return (
    <div className="flex flex-col gap-6">
      <form action={profileAction} className="flex max-w-[480px] flex-col gap-3 rounded-[10px] border border-line bg-white p-5">
        <h2 className="font-heading text-lg font-bold uppercase tracking-[1px]">{t.updateProfile}</h2>
        <label className="flex flex-col gap-1 text-sm font-bold">
          {t.name}
          <Input name="name" defaultValue={user.name} required minLength={2} className="h-11" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold">
          {t.email}
          <Input value={user.email} disabled className="h-11 bg-card" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold">
          {t.phone}
          <Input name="phone" defaultValue={user.phone ?? ""} className="h-11" />
        </label>
        <Feedback state={profileState} />
        <Button type="submit" className="self-start" disabled={profilePending}>
          {t.save}
        </Button>
      </form>

      <form action={passwordAction} className="flex max-w-[480px] flex-col gap-3 rounded-[10px] border border-line bg-white p-5">
        <h2 className="font-heading text-lg font-bold uppercase tracking-[1px]">{t.changePassword}</h2>
        {!hasPassword ? (
          <p className="text-sm text-gray-6">{t.noPassword}</p>
        ) : (
          <>
            <label className="flex flex-col gap-1 text-sm font-bold">
              {t.currentPassword}
              <Input name="currentPassword" type="password" autoComplete="current-password" required className="h-11" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-bold">
              {t.newPassword}
              <Input name="newPassword" type="password" autoComplete="new-password" required minLength={8} className="h-11" />
            </label>
            <Feedback state={passwordState} />
            <Button type="submit" className="self-start" disabled={passwordPending}>
              {t.save}
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
