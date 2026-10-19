import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  uniqueIndex,
  index,
  integer,
  doublePrecision,
  jsonb,
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
  /**
   * Expiry of the newest claim link (Neon transfer request). Neon has no way
   * to list or revoke those, so a live link blocks moving the project to
   * another virtual org: whoever holds it could still take the project.
   */
  claimLinkExpiresAt: timestamp("claim_link_expires_at", {
    withTimezone: true,
  }),
});

/**
 * Mirror of the Neon API state the console renders, so pages can subscribe
 * to it with Neon Realtime. Column names match the Neon API's field names.
 * Counters are `double precision` because int8 arrives as a string on the
 * live side. `mirrored_at` orders writers: a sync only overwrites or deletes
 * rows mirrored before it started reading the API.
 */
const tz = (name: string) => timestamp(name, { withTimezone: true });

export const neonProject = pgTable("neon_project", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  region_id: text("region_id").notNull(),
  pg_version: integer("pg_version").notNull(),
  created_at: tz("created_at").notNull(),
  updated_at: tz("updated_at").notNull(),
  compute_last_active_at: tz("compute_last_active_at"),
  history_retention_seconds: integer("history_retention_seconds").notNull(),
  store_passwords: boolean("store_passwords").notNull(),
  proxy_host: text("proxy_host").notNull(),
  creation_source: text("creation_source").notNull(),
  settings: jsonb("settings"),
  default_endpoint_settings: jsonb("default_endpoint_settings"),
  branch_logical_size_limit_bytes: doublePrecision("branch_logical_size_limit_bytes").notNull(),
  maintenance_starts_at: tz("maintenance_starts_at"),
  hipaa_enabled_at: tz("hipaa_enabled_at"),
  compute_time_seconds: doublePrecision("compute_time_seconds").notNull(),
  active_time_seconds: doublePrecision("active_time_seconds").notNull(),
  cpu_used_sec: doublePrecision("cpu_used_sec").notNull(),
  data_transfer_bytes: doublePrecision("data_transfer_bytes").notNull(),
  written_data_bytes: doublePrecision("written_data_bytes").notNull(),
  data_storage_bytes_hour: doublePrecision("data_storage_bytes_hour").notNull(),
  synthetic_storage_size: doublePrecision("synthetic_storage_size"),
  consumption_period_start: tz("consumption_period_start").notNull(),
  consumption_period_end: tz("consumption_period_end").notNull(),
  mirrored_at: tz("mirrored_at").notNull(),
});

export const neonBranch = pgTable(
  "neon_branch",
  {
    id: text("id").primaryKey(),
    project_id: text("project_id")
      .notNull()
      .references(() => neonProject.id, { onDelete: "cascade" }),
    parent_id: text("parent_id"),
    parent_lsn: text("parent_lsn"),
    parent_timestamp: tz("parent_timestamp"),
    name: text("name").notNull(),
    current_state: text("current_state").notNull(),
    pending_state: text("pending_state"),
    state_changed_at: tz("state_changed_at").notNull(),
    logical_size: doublePrecision("logical_size"),
    creation_source: text("creation_source").notNull(),
    primary: boolean("primary"),
    default: boolean("default").notNull(),
    protected: boolean("protected").notNull(),
    cpu_used_sec: doublePrecision("cpu_used_sec").notNull(),
    compute_time_seconds: doublePrecision("compute_time_seconds").notNull(),
    active_time_seconds: doublePrecision("active_time_seconds").notNull(),
    written_data_bytes: doublePrecision("written_data_bytes").notNull(),
    data_transfer_bytes: doublePrecision("data_transfer_bytes").notNull(),
    created_at: tz("created_at").notNull(),
    updated_at: tz("updated_at").notNull(),
    ttl_interval_seconds: integer("ttl_interval_seconds"),
    expires_at: tz("expires_at"),
    last_reset_at: tz("last_reset_at"),
    created_by: jsonb("created_by"),
    init_source: text("init_source"),
    restore_status: text("restore_status"),
    restored_from: text("restored_from"),
    restored_as: text("restored_as"),
    mirrored_at: tz("mirrored_at").notNull(),
  },
  (t) => [index("neon_branch_project_idx").on(t.project_id)]
);

/**
 * One row per "Create project" submission, keyed by an id the browser picks,
 * so every open projects list sees the project being created and a double
 * submit can't create two.
 */
export const projectCreation = pgTable(
  "project_creation",
  {
    id: uuid("id").primaryKey(),
    org_id: uuid("org_id")
      .notNull()
      .references(() => appOrg.id, { onDelete: "cascade" }),
    created_by: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    region_id: text("region_id").notNull(),
    pg_version: integer("pg_version").notNull(),
    /** `creating` → `configuring` → `ready`, or `failed`. */
    status: text("status").notNull(),
    project_id: text("project_id"),
    error: text("error"),
    failures: jsonb("failures").$type<{ service: string; error: string }[]>().notNull(),
    created_at: tz("created_at").notNull().defaultNow(),
    updated_at: tz("updated_at").notNull().defaultNow(),
  },
  (t) => [index("project_creation_org_idx").on(t.org_id)]
);

/** Bookkeeping for mirror syncs: when a scope last synced, and who holds it. */
export const mirrorSync = pgTable("mirror_sync", {
  scope: text("scope").primaryKey(),
  synced_at: tz("synced_at"),
  claimed_at: tz("claimed_at"),
});

export type NeonProjectRow = typeof neonProject.$inferSelect;
export type NeonBranchRow = typeof neonBranch.$inferSelect;
export type ProjectCreationRow = typeof projectCreation.$inferSelect;

export type AppOrg = typeof appOrg.$inferSelect;
export type AppOrgMember = typeof appOrgMember.$inferSelect;
export type AppProject = typeof appProject.$inferSelect;
export type User = typeof user.$inferSelect;
