import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";
import { can, isAdminAreaRole, type AccessLevel, type AdminModule } from "./permissions";
import type { Session } from "next-auth";

/**
 * Session user id, verified against the DB — a JWT can outlive its user row
 * (re-seeds, deleted accounts). Every server action that WRITES rows keyed by
 * userId must use this instead of session.user.id.
 */
export async function verifiedUserId(): Promise<string | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const exists = await db.user.findUnique({ where: { id }, select: { id: true } });
  return exists ? id : null;
}

/**
 * Server-side guards — every admin page and server action re-verifies here,
 * independent of the middleware (defense in depth; §6 Security).
 */

export async function requireUser(): Promise<Session> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireAdminModule(
  module: AdminModule,
  level: AccessLevel = "view",
): Promise<Session> {
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=${encodeURIComponent("/admin")}`);
  if (!isAdminAreaRole(session.user.role)) redirect("/");
  if (!can(session.user.role, module, level)) redirect(`/admin/forbidden?m=${module}&l=${level}`);
  return session;
}

/**
 * Permission check for admin server actions / route handlers, where a
 * redirect() is the wrong failure mode. Throws "forbidden" instead; also
 * re-verifies the user row still exists (stale-JWT guard) and returns the
 * verified actor id for audit logging.
 */
export async function requireAdminAction(
  module: AdminModule,
  level: AccessLevel = "edit",
): Promise<{ userId: string; role: string }> {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || !can(role, module, level)) throw new Error("forbidden");
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isActive: true },
  });
  if (!user?.isActive) throw new Error("forbidden");
  return { userId: user.id, role: role as string };
}
