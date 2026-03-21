import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";

// ── Better Auth tables ──────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").default("user"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonated_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── Rocky-specific tables ───────────────────────────────────────────────────

export const allowedPlatformUser = pgTable("allowed_platform_user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  platform: text("platform").notNull(), // slack, discord, github, linear, telegram
  platformUserId: text("platform_user_id").notNull(),
  platformUsername: text("platform_username"),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const allowedRepo = pgTable("allowed_repo", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  owner: text("owner").notNull(),
  name: text("name").notNull(),
  fullName: text("full_name").notNull(), // owner/name
  addedBy: text("added_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const task = pgTable("task", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  type: text("type").notNull(), // schedule, linear-issue, implement, general
  status: text("status").notNull().default("pending"), // pending, running, completed, failed
  platform: text("platform").notNull(),
  threadId: text("thread_id"),
  requestedBy: text("requested_by"), // platform user id
  input: text("input").notNull(),
  output: text("output"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const taskLog = pgTable("task_log", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  taskId: text("task_id")
    .notNull()
    .references(() => task.id, { onDelete: "cascade" }),
  level: text("level").notNull().default("info"), // info, warn, error, debug
  message: text("message").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
