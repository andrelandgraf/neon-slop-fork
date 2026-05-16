import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Better Auth core tables. Names + columns follow Better Auth's
 * default Drizzle schema so the adapter doesn't need to be told
 * about aliases. The auth runtime owns these — don't mutate them
 * from app code.
 */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * App-level tenancy: a single shared Neon control-plane org powers
 * every tenant in this clone. Each user gets a default virtual org
 * ("Personal") on signup; they can create more.
 *
 * `app_org` is the unit of ownership for everything else (today:
 * projects; tomorrow: collaborators, billing, settings).
 */
export const appOrg = pgTable("app_org", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /**
   * The user who created the org. Used to bootstrap permissions —
   * org membership is the authoritative source of truth.
   */
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const appOrgMember = pgTable(
  "app_org_member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => appOrg.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("app_org_member_unique").on(t.orgId, t.userId)]
);

/**
 * Maps a real Neon project (control-plane id) to the virtual app
 * org that owns it. We use this as the only authoritative source of
 * "does this user own this project?" — the Neon API itself can't
 * tell us, because every project in this org technically belongs to
 * the same root API key.
 */
export const appProject = pgTable("app_project", {
  /** Neon project id, e.g. "proud-leaf-96621115". */
  projectId: text("project_id").primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => appOrg.id, { onDelete: "cascade" }),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AppOrg = typeof appOrg.$inferSelect;
export type AppOrgMember = typeof appOrgMember.$inferSelect;
export type AppProject = typeof appProject.$inferSelect;
export type User = typeof user.$inferSelect;
