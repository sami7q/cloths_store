"use client";

import { signOutAction } from "@/server/auth";
import { Button } from "@/components/ui/button";

export function SignOutButton({ label }: { label: string }) {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="outline" size="sm">
        {label}
      </Button>
    </form>
  );
}
