import type { DataSource } from "typeorm";
import { allowAuditDelete } from "../audit/audit-delete-guard";

const AUDIT_EVENTS = "audit_events";

/**
 * Empties the named tables between tests. Everything is truncated (CASCADE) except `audit_events`,
 * which refuses TRUNCATE (SEC-F): its rows are deleted the only way the table allows, in a
 * transaction that declares a delete reason. Test databases only.
 */
export async function emptyTables(
  dataSource: DataSource,
  tables: readonly string[],
): Promise<void> {
  const truncatable = tables.filter((t) => t !== AUDIT_EVENTS);
  if (truncatable.length > 0) {
    await dataSource.query(`TRUNCATE ${truncatable.map((t) => `"${t}"`).join(", ")} CASCADE`);
  }
  if (tables.includes(AUDIT_EVENTS)) {
    await dataSource.transaction(async (manager) => {
      await allowAuditDelete(manager, "retention");
      await manager.query(`DELETE FROM "${AUDIT_EVENTS}"`);
    });
  }
}

/** Empties every entity table (derived from the entity metadata, so a new entity is included). */
export async function emptyEntityTables(dataSource: DataSource): Promise<void> {
  await emptyTables(
    dataSource,
    dataSource.entityMetadatas.map((m) => m.tableName),
  );
}
