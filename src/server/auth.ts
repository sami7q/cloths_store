"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { signIn, signOut } from "@/lib/auth";
import { isAdminAreaRole } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { messages } from "@/lib/i18n";

export type AuthFormState = { error?: string; success?: string };

async function clientKey(prefix: string): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return `${prefix}:${ip}`;
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  callbackUrl: z.string().optional(),
});

export async function authenticate(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: messages.auth.invalidCredentials };

  if (!rateLimit(await clientKey(`login:${parsed.data.email.toLowerCase()}`))) {
    return { error: messages.auth.tooManyAttempts };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: messages.auth.invalidCredentials };
    throw e;
  }

  // Only allow internal callback paths; role decides the default landing page.
  const cb = parsed.data.callbackUrl;
  if (cb && cb.startsWith("/") && !cb.startsWith("//")) redirect(cb);
  const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  redirect(isAdminAreaRole(user?.role) ? "/admin" : "/account");
}

const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8).max(100),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"] });

export async function register(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!rateLimit(await clientKey("register"), 5, 60_000)) {
    return { error: messages.auth.tooManyAttempts };
  }

  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.path[0] === "confirmPassword") return { error: messages.auth.passwordMismatch };
    if (issue?.path[0] === "password") return { error: messages.auth.passwordTooShort };
    return { error: messages.auth.invalidInput };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: messages.auth.emailTaken };

  await db.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      role: "CUSTOMER",
    },
  });

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (e) {
    if (e instanceof AuthError) redirect("/login");
    throw e;
  }
  redirect("/account");
}

const forgotSchema = z.object({ email: z.string().email() });

export async function requestPasswordReset(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!rateLimit(await clientKey("forgot"), 3, 60_000)) {
    return { error: messages.auth.tooManyAttempts };
  }
  const parsed = forgotSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: messages.auth.invalidInput };

  // Email delivery lands with the SMTP layer (Phase 4). Same response either
  // way — no account enumeration.
  return { success: messages.auth.resetSent };
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
