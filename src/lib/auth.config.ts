import type { NextAuthConfig } from "next-auth";
import type { Role } from "./enums";

/**
 * Edge-safe NextAuth config — imported by src/middleware.ts, so it must not
 * pull in Prisma/bcrypt. Providers and DB-touching callbacks live in
 * src/lib/auth.ts, which spreads this object.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      // On sign-in `user` is set; auth.ts overrides this to add DB lookups.
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.id === "string") session.user.id = token.id;
      if (typeof token.role === "string") session.user.role = token.role as Role;
      return session;
    },
  },
} satisfies NextAuthConfig;
