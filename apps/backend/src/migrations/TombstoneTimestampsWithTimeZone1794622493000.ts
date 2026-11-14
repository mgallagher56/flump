import type { MigrationInterface, QueryRunner } from "typeorm";
import { convertTimestampColumns } from "../integrity/timestamp-columns";

// BE-08 (backend audit M5): BE-04's AddAccountDeletionTombstones1794622492000 runs after
// TimestampsWithTimeZone1794358500000 and creates its columns as `timestamp`. This converts them
// to `timestamptz` the same way (session time zone UTC, no table rewrite, lock_timeout).
// down() converts them back.
export const TOMBSTONE_TIMESTAMP_COLUMNS = [
  ["account_deletion_tombstones", "deleted_at"],
  ["account_deletion_tombstones", "identity_deleted_at"],
  ["account_deletion_tombstones", "expires_at"],
] as const;

export class TombstoneTimestampsWithTimeZone1794622493000 implements MigrationInterface {
  name = "TombstoneTimestampsWithTimeZone1794622493000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await convertTimestampColumns(
      queryRunner,
      TOMBSTONE_TIMESTAMP_COLUMNS,
      "timestamp without time zone",
      "timestamptz",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await convertTimestampColumns(
      queryRunner,
      TOMBSTONE_TIMESTAMP_COLUMNS,
      "timestamp with time zone",
      "timestamp",
    );
  }
}
