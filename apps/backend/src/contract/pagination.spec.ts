import { DEFAULT_TRANSACTION_PAGE, MAX_TRANSACTION_PAGE } from "@flump/api-contract";
import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import {
  decodeCursor,
  encodeCursor,
  type KeysetOrder,
  keysetPage,
  resolvePage,
  sendPage,
} from "./pagination";

const ORDER: KeysetOrder = {
  keys: [
    { column: '"a"."created_at"', kind: "timestamp" },
    { column: '"a"."id"', kind: "uuid" },
  ],
  direction: "ASC",
};
const ID = "6f1c2a4e-8b3d-4c5e-9f70-1a2b3c4d5e6f";
const TS = "2026-11-14T09:30:00.123456";

/** Records every builder call; returns `rows` (entities) with `raw` key columns. */
const recordingBuilder = (rows: { id: string; ts: string }[]) => {
  const calls: [string, unknown[]][] = [];
  let limit = Number.POSITIVE_INFINITY;
  const qb: Record<string, unknown> = {};
  for (const method of ["andWhere", "addSelect", "orderBy", "addOrderBy"]) {
    qb[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return qb;
    };
  }
  qb.limit = (n: number) => {
    calls.push(["limit", [n]]);
    limit = n;
    return qb;
  };
  qb.getRawAndEntities = async () => {
    const page = rows.slice(0, limit);
    return {
      entities: page.map((r) => ({ id: r.id })),
      raw: page.map((r) => ({ __keyset_0: r.ts, __keyset_1: r.id })),
    };
  };
  return { qb: qb as never, calls };
};

const rowsOf = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    ts: `2026-01-01T00:00:0${i}.000000`,
  }));

describe("resolvePage", () => {
  it("defaults to the kind's default and caps at its maximum", () => {
    expect(resolvePage(undefined, "transactions")).toEqual({ limit: DEFAULT_TRANSACTION_PAGE });
    expect(resolvePage({}, "accounts")).toEqual({ limit: 500 });
    expect(resolvePage({ limit: "25" }, "budget")).toEqual({ limit: 25 });
    expect(resolvePage({ limit: 7, cursor: "abc_-" }, "tax")).toEqual({
      limit: 7,
      cursor: "abc_-",
    });
  });

  it("rejects a limit out of range or a malformed cursor with 400 validation_failed", () => {
    for (const query of [
      { limit: "0" },
      { limit: String(MAX_TRANSACTION_PAGE + 1) },
      { limit: "x" },
      { cursor: "a b" },
    ]) {
      try {
        resolvePage(query, "transactions");
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const body = (error as BadRequestException).getResponse() as { code: string };
        expect(body.code).toBe("validation_failed");
      }
    }
  });

  it("ignores the route's other query fields", () => {
    expect(resolvePage({ accountId: ID, limit: "3" }, "transactions")).toEqual({ limit: 3 });
  });
});

describe("cursor encoding", () => {
  it("round-trips the sort key and id", () => {
    const cursor = encodeCursor([TS, ID]);
    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeCursor(cursor, ORDER.keys)).toEqual([TS, ID]);
    const ints = [
      { column: "y", kind: "int" },
      { column: "m", kind: "int" },
      { column: "id", kind: "int" },
    ] as const;
    expect(decodeCursor(encodeCursor([2026, 11, 42]), ints)).toEqual([2026, 11, 42]);
    const dated = [
      { column: "d", kind: "date" },
      { column: "id", kind: "uuid" },
    ] as const;
    expect(decodeCursor(encodeCursor(["2026-04-05", ID]), dated)).toEqual(["2026-04-05", ID]);
  });

  it("rejects anything the server did not build", () => {
    for (const cursor of [
      "not-json",
      encodeCursor([TS]),
      encodeCursor([TS, ID, 1]),
      encodeCursor([ID, TS]),
      encodeCursor(["2026-11-14", ID]),
      encodeCursor(["2026-11-14T09:30:00.123Z", ID]),
      encodeCursor(["2026-13-14T09:30:00.123456", ID]),
      encodeCursor([TS, "not-a-uuid"]),
      Buffer.from('{"k":1}').toString("base64url"),
    ]) {
      expect(() => decodeCursor(cursor, ORDER.keys)).toThrow(BadRequestException);
    }
    const ints = [{ column: "id", kind: "int" }] as const;
    expect(() => decodeCursor(encodeCursor([1.5]), ints)).toThrow(BadRequestException);
  });
});

describe("keysetPage", () => {
  it("fetches one row more than the page and returns the next cursor from the last row", async () => {
    const rows = rowsOf(3);
    const { qb, calls } = recordingBuilder(rows);
    const page = await keysetPage(qb, ORDER, { limit: 2 });
    expect(page.items.map((r) => r.id)).toEqual([rows[0]?.id, rows[1]?.id]);
    expect(calls).toContainEqual(["limit", [3]]);
    expect(decodeCursor(page.nextCursor as string, ORDER.keys)).toEqual([rows[1]?.ts, rows[1]?.id]);
    // Ordered by the raw timestamp column (index-friendly), then id, both ascending.
    expect(calls).toContainEqual(["orderBy", ['"a"."created_at"', "ASC"]]);
    expect(calls).toContainEqual(["addOrderBy", ['"a"."id"', "ASC"]]);
    expect(calls.some(([m]) => m === "andWhere")).toBe(false);
  });

  it("returns no cursor on the last page", async () => {
    const { qb } = recordingBuilder(rowsOf(2));
    const page = await keysetPage(qb, ORDER, { limit: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBeNull();
  });

  it("continues after the cursor with a row comparison in the list's direction", async () => {
    const { qb, calls } = recordingBuilder([]);
    await keysetPage(
      qb,
      { ...ORDER, direction: "DESC" },
      { limit: 5, cursor: encodeCursor([TS, ID]) },
    );
    const where = calls.find(([m]) => m === "andWhere");
    expect(where?.[1][0]).toBe(
      `("a"."created_at", "a"."id") < ((CAST(:__keyset0 AS timestamp) AT TIME ZONE 'UTC'), CAST(:__keyset1 AS uuid))`,
    );
    expect(where?.[1][1]).toEqual({ __keyset0: TS, __keyset1: ID });
  });

  it("rejects a forged cursor before querying", async () => {
    const { qb, calls } = recordingBuilder([]);
    await expect(keysetPage(qb, ORDER, { limit: 5, cursor: encodeCursor([1, 2]) })).rejects.toThrow(
      BadRequestException,
    );
    expect(calls).toEqual([]);
  });
});

describe("sendPage", () => {
  it("sets X-Next-Cursor only when another page follows and maps the rows", () => {
    const res = { setHeader: vi.fn() };
    expect(sendPage(res, { items: [1, 2], nextCursor: "abc" }, (n) => n * 10)).toEqual([10, 20]);
    expect(res.setHeader).toHaveBeenCalledWith("X-Next-Cursor", "abc");
    res.setHeader.mockClear();
    expect(sendPage(res, { items: [1], nextCursor: null })).toEqual([1]);
    expect(res.setHeader).not.toHaveBeenCalled();
    expect(sendPage(undefined, { items: [], nextCursor: "abc" })).toEqual([]);
  });
});
