import "reflect-metadata";
import {
  Column,
  CreateDateColumn,
  Entity,
  getMetadataArgsStorage,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import { describe, expect, it } from "vitest";
import { ENTITIES } from "../config/typeorm.options";

// Index law (backend audit H7, plan BE-02). Every `user_id` column must lead an index, a unique
// key or the primary key, so a per-user read never scans every user's rows. Every other `*_id`
// column must too, unless it is listed below with the reason it never needs one. This reads the
// entity decorators; the real-Postgres twin in migrations.integration.spec.ts checks that the
// migrations really built them, and that every foreign key is indexed.

/** `table.column` -> why no index leads with it. Keep this short; prefer adding the index. */
const NOT_INDEXED_ON_PURPOSE: Record<string, string> = {
  "accounts.connection_id":
    "only read together with user_id, which IDX_accounts_user_created serves",
  "accounts.external_account_id": "only read together with user_id and connection_id",
  "agent_audit_events.token_id":
    "never filtered on; IDX_agent_audit_events_user_created serves reads",
  "bank_connections.institution_id": "a provider identifier, never filtered on",
  "bank_oauth_states.institution_id": "compared after the state_hash lookup, never filtered on",
  "idempotency_keys.route_id":
    "only read together with user_id, which UQ_idempotency_keys_user_route_key leads",
};

// biome-ignore lint/complexity/noBannedTypes: TypeORM entity classes are typed as Function
type EntityClass = Function;

function tableName(entity: EntityClass): string {
  const table = getMetadataArgsStorage().tables.find((t) => t.target === entity);
  return table?.name ?? entity.name;
}

/** Database column names that lead an index, a unique key or the primary key. */
function leadingColumns(entity: EntityClass): Set<string> {
  const storage = getMetadataArgsStorage();
  const columns = storage.filterColumns(entity);
  const dbName = (property: string): string =>
    columns.find((c) => c.propertyName === property)?.options.name ?? property;

  const leading = new Set<string>();
  const primary = columns.filter((c) => c.options.primary);
  if (primary[0]) leading.add(dbName(primary[0].propertyName));
  for (const column of columns) {
    if (column.options.unique) leading.add(dbName(column.propertyName));
  }
  for (const index of storage.filterIndices(entity)) {
    const first = Array.isArray(index.columns) ? index.columns[0] : undefined;
    if (typeof first === "string") leading.add(dbName(first));
  }
  for (const unique of storage.filterUniques(entity)) {
    const first = Array.isArray(unique.columns) ? unique.columns[0] : undefined;
    if (typeof first === "string") leading.add(dbName(first));
  }
  return leading;
}

/** `table.column` for every user_id or *_id column with no index leading on it. */
function unindexedIdColumns(entity: EntityClass): string[] {
  const table = tableName(entity);
  const leading = leadingColumns(entity);
  return getMetadataArgsStorage()
    .filterColumns(entity)
    .map((c) => c.options.name ?? c.propertyName)
    .filter((name) => name.endsWith("_id") && !leading.has(name))
    .map((name) => `${table}.${name}`)
    .filter((key) => !(key in NOT_INDEXED_ON_PURPOSE));
}

describe("table laws: indexed id columns", () => {
  it("every entity's user_id and *_id columns lead an index (or are listed with a reason)", () => {
    const offenders = ENTITIES.flatMap(unindexedIdColumns);
    expect(offenders).toEqual([]);
  });

  it("never excuses a user_id column", () => {
    expect(Object.keys(NOT_INDEXED_ON_PURPOSE).filter((k) => k.endsWith(".user_id"))).toEqual([]);
  });

  it("lists only columns that exist and still have no index", () => {
    const real = new Set(
      ENTITIES.flatMap((e) =>
        getMetadataArgsStorage()
          .filterColumns(e)
          .map((c) => `${tableName(e)}.${c.options.name ?? c.propertyName}`),
      ),
    );
    const indexed = new Set(
      ENTITIES.flatMap((e) => [...leadingColumns(e)].map((c) => `${tableName(e)}.${c}`)),
    );
    for (const key of Object.keys(NOT_INDEXED_ON_PURPOSE)) {
      expect(real.has(key), `${key} is not a column`).toBe(true);
      expect(indexed.has(key), `${key} is indexed now; remove it from the list`).toBe(false);
    }
  });

  it("fails a new entity whose user_id has no index, and passes it once indexed", () => {
    @Entity("law_fixture_unindexed")
    class Unindexed {
      @PrimaryGeneratedColumn("uuid")
      id: string;

      @Column({ name: "user_id" })
      userId: string;

      @Column({ name: "widget_id" })
      widgetId: string;
    }

    @Index("IDX_law_fixture_indexed_user", ["userId", "createdAt"])
    @Entity("law_fixture_indexed")
    class Indexed {
      @PrimaryGeneratedColumn("uuid")
      id: string;

      @Column({ name: "user_id" })
      userId: string;

      @Index("IDX_law_fixture_indexed_widget")
      @Column({ name: "widget_id" })
      widgetId: string;

      @Column({ name: "created_at" })
      createdAt: string;
    }

    expect(unindexedIdColumns(Unindexed)).toEqual([
      "law_fixture_unindexed.user_id",
      "law_fixture_unindexed.widget_id",
    ]);
    expect(unindexedIdColumns(Indexed)).toEqual([]);
  });
});

// Time zone law (backend audit M5, plan BE-08): every timestamp column is `timestamptz`, so an
// instant means the same thing whatever time zone Node or Postgres runs in.
// TimestampsWithTimeZone1794358500000 converted the existing columns; this keeps new ones right.
const TIMESTAMP_TYPES = new Set(["timestamp", "timestamp without time zone", "datetime"]);

/** `table.column` for every column stored as a timestamp without a time zone. */
function timestampsWithoutTimeZone(entity: EntityClass): string[] {
  const table = tableName(entity);
  return getMetadataArgsStorage()
    .filterColumns(entity)
    .filter((c) => {
      const type = typeof c.options.type === "string" ? c.options.type : undefined;
      if (type !== undefined) return TIMESTAMP_TYPES.has(type);
      // No explicit type: date columns and Date-typed properties default to `timestamp`.
      if (c.mode === "createDate" || c.mode === "updateDate" || c.mode === "deleteDate") {
        return true;
      }
      const target = c.target as { prototype?: object };
      return Reflect.getMetadata("design:type", target.prototype ?? {}, c.propertyName) === Date;
    })
    .map((c) => `${table}.${c.options.name ?? c.propertyName}`);
}

describe("table laws: timestamps carry a time zone", () => {
  it("every entity timestamp column is timestamptz", () => {
    expect(ENTITIES.flatMap(timestampsWithoutTimeZone)).toEqual([]);
  });

  it("fails a column declared without a time zone, and passes it as timestamptz", () => {
    @Entity("law_fixture_naive_time")
    class Naive {
      @PrimaryGeneratedColumn("uuid")
      id: string;

      @CreateDateColumn({ name: "created_at" })
      createdAt: Date;

      @Column({ name: "seen_at", type: "timestamp", nullable: true })
      seenAt: Date | null;

      @Column({ name: "synced_at", nullable: true })
      syncedAt: Date;
    }

    @Entity("law_fixture_aware_time")
    class Aware {
      @PrimaryGeneratedColumn("uuid")
      id: string;

      @CreateDateColumn({ name: "created_at", type: "timestamptz" })
      createdAt: Date;

      @Column({ name: "seen_at", type: "timestamptz", nullable: true })
      seenAt: Date | null;

      @Column("date", { name: "as_of_date" })
      asOfDate: string;
    }

    expect(timestampsWithoutTimeZone(Naive)).toEqual([
      "law_fixture_naive_time.created_at",
      "law_fixture_naive_time.seen_at",
      "law_fixture_naive_time.synced_at",
    ]);
    expect(timestampsWithoutTimeZone(Aware)).toEqual([]);
  });
});
