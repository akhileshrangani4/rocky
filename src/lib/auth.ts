import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb, schema } from "@/db";
import { count } from "drizzle-orm";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL,
  database: drizzleAdapter(getDb(), {
    provider: "pg",
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.AUTH_GITHUB_CLIENT_ID!,
      clientSecret: process.env.AUTH_GITHUB_CLIENT_SECRET!,
    },
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
  ],
  session: {
    expiresIn: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // First user becomes admin
          const db = getDb();
          const [{ value }] = await db
            .select({ value: count() })
            .from(schema.user);
          if (value === 0) {
            return { data: { ...user, role: "admin" } };
          }
          return { data: user };
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
