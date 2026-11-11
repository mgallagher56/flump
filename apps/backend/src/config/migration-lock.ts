// Postgres advisory-lock key shared by every migration that must not run concurrently
// across instances (taken with pg_advisory_xact_lock inside the migration transaction).
export const MIGRATION_LOCK_KEY = "1794355200000";
