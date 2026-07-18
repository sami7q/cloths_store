import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "./db";
import { authConfig } from "./auth.config";
import type { Role } from "./enums";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const googleEnabled = Boolean(process.env.GOOGLE_ID && process.env.GOOGLE_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
        if (!user?.passwordHash || !user.isActive) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role as Role };
      },
    }),
    ...(googleEnabled
      ? [Google({ clientId: process.env.GOOGLE_ID, clientSecret: process.env.GOOGLE_SECRET })]
      : []),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "google" && user.email) {
          // OAuth users get a DB row so orders/wishlist/reviews can reference them.
          const dbUser = await db.user.upsert({
            where: { email: user.email.toLowerCase() },
            update: { avatarUrl: user.image ?? undefined },
            create: {
              email: user.email.toLowerCase(),
              name: user.name ?? user.email,
              avatarUrl: user.image ?? undefined,
              role: "CUSTOMER",
            },
          });
          if (!dbUser.isActive) throw new Error("Account disabled");
          token.id = dbUser.id;
          token.role = dbUser.role as Role;
        } else {
          token.id = user.id;
          token.role = user.role;
        }
      }
      return token;
    },
  },
});
