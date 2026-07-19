"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth-guards";
import { audit } from "@/lib/admin/audit";
import { messages } from "@/lib/i18n";
import { sendStaffInvite } from "@/lib/mail";

/** Admin Staff & Roles module (§6.13). ADMIN-only via the permissions matrix. */

const t = messages.admin;
const STAFF_ROLES = ["STAFF", "MANAGER", "ADMIN"] as const;

const inviteSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(160),
  role: z.enum(STAFF_ROLES),
});

export type InviteResult =
  | { ok: true; message: string; tempPassword: string }
  | { ok: false; error: string };

export async function inviteStaff(raw: unknown): Promise<InviteResult> {
  let actor;
  try {
    actor = await requireAdminAction("staff");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = inviteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.common.error };
  const input = parsed.data;

  const existing = await db.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) return { ok: false, error: t.staff.emailTaken };

  // URL-safe temp password; the admin sees it once, email goes out when SMTP is up.
  const tempPassword = randomBytes(9).toString("base64url");
  const created = await db.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      role: input.role,
      passwordHash: await bcrypt.hash(tempPassword, 10),
    },
  });
  await audit(actor.userId, "staff.invite", "User", created.id, { role: input.role });

  await sendStaffInvite({ to: created.email, name: created.name, tempPassword });

  revalidatePath("/admin/staff");
  return { ok: true, message: t.staff.invited, tempPassword };
}

export type StaffActionResult = { ok: true; message: string } | { ok: false; error: string };

type GuardResult =
  | { error: string; target?: never }
  | { error?: never; target: NonNullable<Awaited<ReturnType<typeof db.user.findUnique>>> };

async function guardTarget(actorId: string, targetId: string): Promise<GuardResult> {
  if (actorId === targetId) return { error: t.staff.cannotSelf };
  const target = await db.user.findUnique({ where: { id: targetId } });
  if (!target || target.role === "CUSTOMER") return { error: t.common.error };
  return { target };
}

/** True if the mutation would leave the store with no active admin. */
async function wouldRemoveLastAdmin(targetId: string) {
  const admins = await db.user.count({ where: { role: "ADMIN", isActive: true, id: { not: targetId } } });
  return admins === 0;
}

export async function setStaffRole(raw: unknown): Promise<StaffActionResult> {
  let actor;
  try {
    actor = await requireAdminAction("staff");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = z.object({ userId: z.string().min(1), role: z.enum(STAFF_ROLES) }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.common.error };

  const guard = await guardTarget(actor.userId, parsed.data.userId);
  if (guard.error !== undefined) return { ok: false, error: guard.error };
  if (guard.target.role === "ADMIN" && parsed.data.role !== "ADMIN" && (await wouldRemoveLastAdmin(guard.target.id)))
    return { ok: false, error: t.staff.lastAdmin };

  await db.user.update({ where: { id: guard.target.id }, data: { role: parsed.data.role } });
  await audit(actor.userId, "staff.role", "User", guard.target.id, {
    from: guard.target.role,
    to: parsed.data.role,
  });
  revalidatePath("/admin/staff");
  return { ok: true, message: t.staff.roleSaved };
}

export async function toggleStaffActive(raw: unknown): Promise<StaffActionResult> {
  let actor;
  try {
    actor = await requireAdminAction("staff");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = z.object({ userId: z.string().min(1) }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.common.error };

  const guard = await guardTarget(actor.userId, parsed.data.userId);
  if (guard.error !== undefined) return { ok: false, error: guard.error };
  if (guard.target.role === "ADMIN" && guard.target.isActive && (await wouldRemoveLastAdmin(guard.target.id)))
    return { ok: false, error: t.staff.lastAdmin };

  await db.user.update({ where: { id: guard.target.id }, data: { isActive: !guard.target.isActive } });
  await audit(actor.userId, "staff.toggleActive", "User", guard.target.id, {
    isActive: !guard.target.isActive,
  });
  revalidatePath("/admin/staff");
  return { ok: true, message: t.staff.roleSaved };
}
