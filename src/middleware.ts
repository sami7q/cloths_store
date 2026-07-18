import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { can, isAdminAreaRole, moduleFromPath } from "@/lib/permissions";

// Edge middleware — uses the edge-safe config (no Prisma). Route-level RBAC;
// every admin page/action re-verifies server-side via auth-guards.ts.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const user = req.auth?.user;

  if (pathname.startsWith("/admin")) {
    if (!user) {
      const login = new URL("/login", nextUrl);
      login.searchParams.set("callbackUrl", pathname);
      return Response.redirect(login);
    }
    if (!isAdminAreaRole(user.role)) {
      return Response.redirect(new URL("/", nextUrl));
    }
    const mod = moduleFromPath(pathname);
    if (mod && !can(user.role, mod, "view")) {
      return Response.redirect(new URL(`/admin/forbidden?m=${mod}&l=view`, nextUrl));
    }
    return;
  }

  if (pathname.startsWith("/account") && !user) {
    const login = new URL("/login", nextUrl);
    login.searchParams.set("callbackUrl", pathname);
    return Response.redirect(login);
  }

  if ((pathname === "/login" || pathname === "/register") && user) {
    return Response.redirect(new URL(isAdminAreaRole(user.role) ? "/admin" : "/account", nextUrl));
  }
});

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/login", "/register"],
};
