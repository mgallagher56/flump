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
    delete: vi.fn(async (where: Row) => {
      for (let i = rows.length - 1; i >= 0; i--) {
        if (matches(rows[i], where)) rows.splice(i, 1);
      }
    }),
  };
};
