import type { neonBranch, neonProject } from "@/lib/db/schema";
import type { Branch, Project } from "@/lib/neon";

export type ProjectInsert = Omit<typeof neonProject.$inferInsert, "mirrored_at">;
export type BranchInsert = Omit<typeof neonBranch.$inferInsert, "mirrored_at">;

const date = (value: string) => new Date(value);
const maybeDate = (value: string | null | undefined) => (value ? new Date(value) : null);

export function projectRow(p: Project): ProjectInsert {
  return {
    id: p.id,
    name: p.name,
    region_id: p.region_id,
    pg_version: p.pg_version,
    created_at: date(p.created_at),
    updated_at: date(p.updated_at),
    compute_last_active_at: maybeDate(p.compute_last_active_at),
    history_retention_seconds: p.history_retention_seconds,
    store_passwords: p.store_passwords,
    proxy_host: p.proxy_host,
    creation_source: p.creation_source,
    settings: p.settings ?? null,
    default_endpoint_settings: p.default_endpoint_settings ?? null,
    branch_logical_size_limit_bytes: p.branch_logical_size_limit_bytes,
    maintenance_starts_at: maybeDate(p.maintenance_starts_at),
    hipaa_enabled_at: maybeDate(p.hipaa_enabled_at),
    compute_time_seconds: p.compute_time_seconds,
    active_time_seconds: p.active_time_seconds,
    cpu_used_sec: p.cpu_used_sec,
    data_transfer_bytes: p.data_transfer_bytes,
    written_data_bytes: p.written_data_bytes,
    data_storage_bytes_hour: p.data_storage_bytes_hour,
    synthetic_storage_size: p.synthetic_storage_size ?? null,
    consumption_period_start: date(p.consumption_period_start),
    consumption_period_end: date(p.consumption_period_end),
  };
}

export function branchRow(b: Branch): BranchInsert {
  return {
    id: b.id,
    project_id: b.project_id,
    parent_id: b.parent_id ?? null,
    parent_lsn: b.parent_lsn ?? null,
    parent_timestamp: maybeDate(b.parent_timestamp),
    name: b.name,
    current_state: b.current_state,
    pending_state: b.pending_state ?? null,
    state_changed_at: date(b.state_changed_at),
    logical_size: b.logical_size ?? null,
    creation_source: b.creation_source,
    primary: b.primary ?? null,
    default: b.default,
    protected: b.protected,
    cpu_used_sec: b.cpu_used_sec,
    compute_time_seconds: b.compute_time_seconds,
    active_time_seconds: b.active_time_seconds,
    written_data_bytes: b.written_data_bytes,
    data_transfer_bytes: b.data_transfer_bytes,
    created_at: date(b.created_at),
    updated_at: date(b.updated_at),
    ttl_interval_seconds: b.ttl_interval_seconds ?? null,
    expires_at: maybeDate(b.expires_at),
    last_reset_at: maybeDate(b.last_reset_at),
    created_by: b.created_by ?? null,
    init_source: b.init_source ?? null,
    restore_status: b.restore_status ?? null,
    restored_from: b.restored_from ?? null,
    restored_as: b.restored_as ?? null,
  };
}
