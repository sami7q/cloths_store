"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth-guards";
import { audit } from "@/lib/admin/audit";
import { messages } from "@/lib/i18n";

/** Admin Customers module (§6.8) mutations. */

const t = messages.admin;

export type ActionState = { error?: string; success?: string };

/** Disable/enable a customer account — auth rejects sign-in when isActive=false. */
export async function toggleCustomerActive(formData: FormData): Promise<void> {
  const { userId } = await requireAdminAction("customers");
  const id = String(formData.get("id") ?? "");
  const user = await db.user.findUnique({ where: { id }, select: { isActive: true, role: true } });
  if (!user || user.role !== "CUSTOMER") return;
  await db.user.update({ where: { id }, data: { isActive: !user.isActive } });
  await audit(userId, "customer.toggleActive", "User", id, { isActive: !user.isActive });
  revalidatePath(`/admin/customers/${id}`);
  revalidatePath("/admin/customers");
}

export async function saveCustomerNotes(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { userId } = await requireAdminAction("customers");
    const id = String(formData.get("id") ?? "");
    const notes = String(formData.get("adminNotes") ?? "").trim().slice(0, 4000);
    const user = await db.user.findUnique({ where: { id }, select: { role: true } });
    if (!user || user.role !== "CUSTOMER") return { error: t.common.error };
    await db.user.update({ where: { id }, data: { adminNotes: notes || null } });
    await audit(userId, "customer.notes", "User", id);
    revalidatePath(`/admin/customers/${id}`);
    return { success: t.customers.notesSaved };
  } catch {
    return { error: t.common.forbidden };
  }
}
