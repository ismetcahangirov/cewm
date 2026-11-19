import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { accounts, rateLimits, sessions, users, verifications } from "@/lib/db/schema";
import { serverEnv } from "@/lib/env.server";
import { passwordMinLength } from "@/lib/validation/auth";

import { passwordEmail } from "./emails";
import { adminPaths } from "./paths";
import { accessControl, roles } from "./roles";

const passwordLinkLifetime = 60 * 60 * 24;

function createAuth() {
  const env = serverEnv();
  const db = getDb();

  return betterAuth({
    appName: "Mebline",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
        rateLimit: rateLimits,
      },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: passwordMinLength,
      resetPasswordTokenExpiresIn: passwordLinkLifetime,
      revokeSessionsOnPasswordReset: true,
      async sendResetPassword({ user, url }) {
        const [row] = await db
          .select({ banned: users.banned, emailVerified: users.emailVerified })
          .from(users)
          .where(eq(users.id, user.id));
        if (!row || row.banned) return;
        await passwordEmail({
          to: user.email,
          name: user.name,
          url,
          kind: row.emailVerified ? "reset" : "invite",
        });
      },
      async onPasswordReset({ user }) {
        await db.update(users).set({ emailVerified: true }).where(eq(users.id, user.id));
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 14,
      updateAge: 60 * 60 * 24,
    },
    user: {
      additionalFields: {
        lastSignInAt: { type: "date", required: false, input: false },
      },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/request-password-reset": { window: 60, max: 3 },
        "/reset-password": { window: 60, max: 5 },
      },
    },
    databaseHooks: {
      session: {
        create: {
          async after(session) {
            await db
              .update(users)
              .set({ lastSignInAt: new Date() })
              .where(eq(users.id, session.userId));
          },
        },
      },
    },
    plugins: [
      admin({
        ac: accessControl,
        roles,
        defaultRole: "editor",
        adminRoles: ["owner"],
        bannedUserMessage: "Hesabınız deaktiv edilib.",
      }),
      nextCookies(),
    ],
  });
}

type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as unknown as { auth?: Auth };

export function getAuth(): Auth {
  globalForAuth.auth ??= createAuth();
  return globalForAuth.auth;
}

export const resetPasswordRedirect = adminPaths.resetPassword;
