import { FindOperator } from "typeorm";
import { vi } from "vitest";

type Row = Record<string, any>;

const matchesValue = (actual: unknown, expected: unknown): boolean =>
  expected instanceof FindOperator && expected.type === "in"
    ? (expected.value as unknown[]).includes(actual)
    : actual === expected;

const matches = (row: Row, where: Row | undefined) =>
  !where || Object.entries(where).every(([key, value]) => matchesValue(row[key], value));

/**
 * A list query builder for keyset pages (contract/pagination.ts) over `source()`. Conditions of
 * the form `alias.prop = :param` really filter, so an unscoped list still leaks and fails a test;
 * the order, the cursor predicate and the key selects are ignored (the real-Postgres suites cover
 * those).
 */
export const fakeListQueryBuilder = (source: () => Row[]) => {
  const filters: [string, string][] = [];
  let params: Row = {};
  let take = Number.POSITIVE_INFINITY;
  let skip = 0;
  const qb = {
    where: (condition: string, p?: Row) => qb.andWhere(condition, p),
    andWhere: (condition: string, p?: Row) => {
      params = { ...params, ...p };
      const m = /^\s*"?\w+"?\."?(\w+)"?\s*=\s*:(\w+)\s*$/.exec(condition);
      if (m) filters.push([m[1] as string, m[2] as string]);
      return qb;
    },
    innerJoin: () => qb,
    addSelect: () => qb,
    orderBy: () => qb,
    addOrderBy: () => qb,
    limit: (n: number) => {
      take = n;
      return qb;
    },
    offset: (n: number) => {
      skip = n;
      return qb;
    },
    getRawAndEntities: async () => {
      const entities = source()
        .filter((row) => filters.every(([prop, name]) => row[prop] === params[name]))
        .slice(skip, skip + take)
        .map((row) => ({ ...row }));
      return { entities, raw: entities.map(() => ({})) };
    },
  };
  return qb;
};

/**
 * Minimal in-memory stand-in for a TypeORM repository, used by cross-user
 * tests. Unlike a canned mock it really evaluates `where` clauses, so a
 * handler that forgets to scope by `userId` will leak rows and fail the test.
 * Reads return copies (like a DB would) so unsaved mutation never leaks.
 */
export const createInMemoryRepository = (seed: Row[] = []) => {
  const rows: Row[] = seed.map((row) => ({ ...row }));
  let nextId = 1;

  const saveOne = (data: Row): Row => {
    const existing = data.id ? rows.findIndex((row) => row.id === data.id) : -1;
    if (existing >= 0) {
      rows[existing] = { ...rows[existing], ...data };
      return { ...rows[existing] };
    }
    const created = { id: `new-${nextId++}`, ...data };
    rows.push(created);
    return { ...created };
  };

  return {
    rows,
    find: vi.fn(async (options?: { where?: Row }) =>
      rows.filter((row) => matches(row, options?.where)).map((row) => ({ ...row })),
    ),
    findOne: vi.fn(async (options?: { where?: Row }) => {
      const found = rows.find((row) => matches(row, options?.where));
      return found ? { ...found } : null;
    }),
    create: vi.fn((data: Row | Row[]) =>
      Array.isArray(data) ? data.map((row) => ({ ...row })) : { ...data },
    ),
    save: vi.fn(async (data: Row | Row[]) =>
      Array.isArray(data) ? data.map(saveOne) : saveOne(data),
    ),
    // ON CONFLICT (conflictColumns) DO UPDATE: insert, or overwrite the row with the same key.
    upsert: vi.fn(async (data: Row, conflictColumns: string[]) => {
      const existing = rows.find((row) => conflictColumns.every((c) => row[c] === data[c]));
      if (existing) Object.assign(existing, data);
      else rows.push({ id: nextId++, ...data });
    }),
    update: vi.fn(async (where: Row, patch: Row) => {
      for (const row of rows) {
        if (matches(row, where)) Object.assign(row, patch);
      }
    }),
    remove: vi.fn(async (data: Row) => {
      const index = rows.findIndex((row) => row.id === data.id);
      if (index >= 0) rows.splice(index, 1);
      return data;
    }),
    createQueryBuilder: vi.fn(() => fakeListQueryBuilder(() => rows)),
    delete: vi.fn(async (where: Row) => {
      for (let i = rows.length - 1; i >= 0; i--) {
        if (matches(rows[i], where)) rows.splice(i, 1);
      }
    }),
  };
};
