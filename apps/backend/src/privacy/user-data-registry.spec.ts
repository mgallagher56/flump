import "reflect-metadata";
import { ACCOUNT_EXPORT_SECTIONS, AccountExportDocument } from "@flump/api-contract";
import { getMetadataArgsStorage } from "typeorm";
import { describe, expect, it } from "vitest";
import { ENTITIES } from "../config/typeorm.options";
import { AccountDetail } from "../entities/account-detail.entity";
import { ImportBatch } from "../entities/import-batch.entity";
import { UserProfile } from "../entities/user-profile.entity";
import { NON_USER_ENTITIES, NOT_USER_LINK_COLUMNS, USER_DATA_REGISTRY } from "./user-data-registry";

/**
 * The user-data coverage test (BE-04 acceptance): shared by account deletion, the data export and
 * the financial reset, which all walk USER_DATA_REGISTRY. A new entity with a user id column, or a
 * new column on a registered entity, fails here until it has explicit handling.
 */
const storage = getMetadataArgsStorage();
const columnsOf = (entity: unknown) => storage.columns.filter((c) => c.target === entity);
const USER_LIKE = /user|owner/i;
const isUserIdColumn = (c: { propertyName: string; options: { name?: string } }) =>
  c.propertyName === "userId" || c.options.name === "user_id";

describe("user-data registry coverage", () => {
  /** A column whose property or database name mentions a user or owner (owner_id, created_by_user). */
  const isUserLikeColumn = (c: { propertyName: string; options: { name?: string } }) =>
    USER_LIKE.test(c.propertyName) || USER_LIKE.test(c.options.name ?? "");
  const relationsOf = (entity: unknown) => storage.relations.filter((r) => r.target === entity);
  const joinColumnsOf = (entity: unknown) => storage.joinColumns.filter((j) => j.target === entity);
  const notALink = (entity: { name: string }, property: string) =>
    Object.hasOwn(NOT_USER_LINK_COLUMNS, `${entity.name}.${property}`);
  const looksUserLinked = (entity: { name: string }) =>
    columnsOf(entity).some((c) => isUserLikeColumn(c) && !notALink(entity, c.propertyName)) ||
    relationsOf(entity).length > 0 ||
    joinColumnsOf(entity).length > 0;

  it("lists every entity in ENTITIES that has a user id column, exactly once", () => {
    const withUserId = ENTITIES.filter((e) => columnsOf(e).some(isUserIdColumn));
    const registered = USER_DATA_REGISTRY.map((t) => t.entity);
    expect(new Set(registered).size).toBe(registered.length);
    const missing = withUserId.filter((e) => !registered.includes(e as never)).map((e) => e.name);
    expect(missing, "entities with a user id and no delete/export/reset handling").toEqual([]);
    for (const t of USER_DATA_REGISTRY) {
      expect(ENTITIES).toContain(t.entity);
      expect(columnsOf(t.entity).some(isUserIdColumn), t.entity.name).toBe(true);
    }
  });

  it("an entity with any user-like column or relation is in the registry or the explicit allow-list", () => {
    const unhandled = ENTITIES.filter(
      (e) =>
        looksUserLinked(e) &&
        !USER_DATA_REGISTRY.some((t) => t.entity === e) &&
        !Object.hasOwn(NON_USER_ENTITIES, e.name),
    ).map((e) => e.name);
    expect(unhandled, "user-linked entities with no delete/export/reset handling").toEqual([]);
  });

  it("registered entities link to the user through user_id only (no second user-like column)", () => {
    for (const t of USER_DATA_REGISTRY) {
      const extra = columnsOf(t.entity)
        .filter(
          (c) =>
            isUserLikeColumn(c) &&
            !isUserIdColumn(c) &&
            !Object.hasOwn(NOT_USER_LINK_COLUMNS, `${t.entity.name}.${c.propertyName}`),
        )
        .map((c) => c.propertyName);
      expect(extra, `${t.entity.name}: handle the extra user link explicitly`).toEqual([]);
      expect(relationsOf(t.entity), t.entity.name).toEqual([]);
    }
  });

  it("everything outside the registry is in the allow-list, with a reason", () => {
    const outside = ENTITIES.filter((e) => !USER_DATA_REGISTRY.some((t) => t.entity === e));
    expect(outside.map((e) => e.name).sort()).toEqual(Object.keys(NON_USER_ENTITIES).sort());
    for (const reason of Object.values(NON_USER_ENTITIES)) {
      expect(reason.length).toBeGreaterThan(20);
    }
  });

  it.each(USER_DATA_REGISTRY.map((t) => [t.entity.name, t] as const))(
    "%s: every column is exported or excluded with a reason, never both",
    (_name, t) => {
      const all = columnsOf(t.entity)
        .map((c) => c.propertyName)
        .sort();
      const exported = [...t.export.columns];
      const excluded = Object.keys(t.export.excluded);
      expect([...exported, ...excluded].sort()).toEqual(all);
      expect(exported.filter((c) => excluded.includes(c))).toEqual([]);
      for (const reason of Object.values(t.export.excluded)) {
        expect(String(reason).length).toBeGreaterThan(10);
      }
      for (const c of t.export.orderBy) expect(exported).toContain(c);
      expect(t.export.batchSize).toBeGreaterThan(0);
    },
  );

  it.each(USER_DATA_REGISTRY.map((t) => [t.key, t] as const))(
    "%s: the projection matches the export document schema field for field",
    (key, t) => {
      const schema = ACCOUNT_EXPORT_SECTIONS[key];
      expect(Object.keys(schema.shape)).toEqual([...t.export.columns]);
      const docField = AccountExportDocument.shape[key];
      expect(docField, key).toBeDefined();
    },
  );

  it("every export section has exactly one registry table", () => {
    expect(USER_DATA_REGISTRY.map((t) => t.key).sort()).toEqual(
      Object.keys(ACCOUNT_EXPORT_SECTIONS).sort(),
    );
  });

  it("never exports a secret column", () => {
    const exported = USER_DATA_REGISTRY.flatMap((t) => t.export.columns.map(String));
    for (const secret of ["tokenHash", "accessToken", "refreshToken"]) {
      expect(exported).not.toContain(secret);
    }
  });

  it("every table has a reset decision with a reason", () => {
    for (const t of USER_DATA_REGISTRY) {
      expect(["financial-clear", "revoke", "keep"]).toContain(t.reset.kind);
      expect(t.reset.reason.length, t.key).toBeGreaterThan(10);
      expect(t.deleteOnErasure).toBe(true);
    }
  });

  it("deletes children before parents and the profile last", () => {
    const order = USER_DATA_REGISTRY.map((t) => t.entity);
    // account_details.import_batch_id references import_batches.
    expect(order.indexOf(AccountDetail)).toBeLessThan(order.indexOf(ImportBatch));
    expect(order.at(-1)).toBe(UserProfile);
  });
});
