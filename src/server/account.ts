"use server";

import { revalidatePath } from "next/cache";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifiedUserId } from "@/lib/auth-guards";
import { messages } from "@/lib/i18n";
import type { AuthFormState } from "./auth";

async function requireUserId(): Promise<string> {
  const userId = await verifiedUserId();
  if (!userId) throw new Error("unauthorized");
  return userId;
}

// -- addresses ---------------------------------------------------------------

const addressSchema = z.object({
  label: z.string().trim().min(1).max(40),
  country: z.string().trim().min(2).max(60),
  city: z.string().trim().min(2).max(60),
  area: z.string().trim().max(80).optional(),
  street: z.string().trim().min(3).max(160),
  building: z.string().trim().max(80).optional(),
  phone: z.string().trim().min(6).max(25),
});

export async function createAddress(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const userId = await requireUserId();
  const parsed = addressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: messages.auth.invalidInput };
  const count = await db.address.count({ where: { userId } });
  await db.address.create({
    data: { ...parsed.data, userId, isDefault: count === 0 },
  });
  revalidatePath("/account/addresses");
  return { success: messages.account.profileSaved };
}

export async function updateAddress(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const parsed = addressSchema.safeParse(Object.fromEntries(formData));
  if (!id || !parsed.success) return { error: messages.auth.invalidInput };
  await db.address.updateMany({ where: { id, userId }, data: parsed.data });
  revalidatePath("/account/addresses");
  return { success: messages.account.profileSaved };
}

export async function deleteAddress(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  await db.address.deleteMany({ where: { id, userId } });
  revalidatePath("/account/addresses");
}

export async function setDefaultAddress(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  await db.$transaction([
    db.address.updateMany({ where: { userId }, data: { isDefault: false } }),
    db.address.updateMany({ where: { id, userId }, data: { isDefault: true } }),
  ]);
  revalidatePath("/account/addresses");
}

// -- profile -----------------------------------------------------------------

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(25).optional(),
});

export async function updateProfile(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const userId = await requireUserId();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: messages.auth.invalidInput };
  await db.user.update({
    where: { id: userId },
    data: { name: parsed.data.name, phone: parsed.data.phone || null },
  });
  revalidatePath("/account");
  return { success: messages.account.profileSaved };
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export async function changePassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const userId = await requireUserId();
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: messages.auth.passwordTooShort };
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) return { error: messages.account.noPassword };
  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return { error: messages.account.wrongPassword };
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) },
  });
  return { success: messages.account.passwordChanged };
}
