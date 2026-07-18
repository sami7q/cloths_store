import { redirect } from "next/navigation";
import { auth } from "./auth";
import { can, isAdminAreaRole, type AccessLevel, type AdminModule } from "./permissions";
import type { Session } from "next-auth";

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
