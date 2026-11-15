import { BadRequestException } from "@nestjs/common";
import type { Repository } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import { decodeCursor, encodeCursor, type KeyColumn } from "../../contract/pagination";
import type { AgentAuditEvent } from "../../entities/agent-audit-event.entity";
import { AgentAuditService } from "./agent-audit.service";

const ACTIVITY_KEYS: KeyColumn[] = [
  { column: '"e"."created_at"', kind: "timestamp" },
  { column: '"e"."id"', kind: "uuid" },
];

const make = () => {
  const insert = vi.fn().mockResolvedValue(undefined);
  const repo = { insert } as unknown as Repository<AgentAuditEvent>;
  return { service: new AgentAuditService(repo), insert };
};

describe("AgentAuditService (E17-N17)", () => {
  it("fingerprints arguments with HMAC-SHA256 only when a key is set", () => {
    const { service } = make();
    const a = service.fingerprint({ x: 1 }, "k");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(service.fingerprint({ x: 1 }, "k")).toBe(a);
    expect(service.fingerprint({ x: 2 }, "k")).not.toBe(a);
    // Key order does not matter, at any depth.
    expect(service.fingerprint({ a: 1, b: { c: 2, d: [1, { f: 1, e: 2 }] } }, "k")).toBe(
      service.fingerprint({ b: { d: [1, { e: 2, f: 1 }], c: 2 }, a: 1 }, "k"),
    );
    expect(service.fingerprint({ x: 1 }, undefined)).toBeNull();
    expect(service.fingerprint(undefined, "k")).toBeNull();
  });

  it("stores identifiers only: bad tool names, codes, scopes and token ids are dropped", async () => {
    const { service, insert } = make();
    await service.record({
      userId: "u1",
      tokenId: "not-a-uuid",
      clientName: "  ",
      toolName: "Drop Table",
      scopesUsed: ["mcp:read:full", "£1,234 Jane"],
      outcome: "nope" as never,
      errorCode: "has space",
      latencyMs: -5,
      responseBytes: Number.NaN,
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenId: null,
        clientName: null,
        toolName: "unknown",
        scopesUsed: ["mcp:read:full"],
        outcome: "error",
        errorCode: null,
        latencyMs: 0,
        responseBytes: 0,
      }),
    );
  });
});

describe("AgentAuditService.listForToken (E17 re-plan PR D)", () => {
  const row = (i: number) => ({
    id: `0b6f4e1a-9c2d-4e3f-a1b2-c3d4e5f6071${i}`,
    userId: "u1",
    tokenId: "t1",
    clientName: null,
    toolName: "list_accounts",
    scopesUsed: ["mcp:read:anonymized"],
    outcome: "ok",
    errorCode: null,
    latencyMs: 5,
    responseBytes: 100,
    argsFingerprint: "f".repeat(64),
    createdAt: new Date(Date.UTC(2026, 10, 14, 10, 0, 10 - i)),
  });

  /** A chainable stand-in for TypeORM's query builder that records each call. */
  const builder = (rows: Array<ReturnType<typeof row>>) => {
    const calls: Array<[string, unknown[]]> = [];
    const qb: Record<string, unknown> = {};
    for (const m of ["where", "andWhere", "addSelect", "orderBy", "addOrderBy", "limit"]) {
      qb[m] = (...args: unknown[]) => {
        calls.push([m, args]);
        return qb;
      };
    }
    qb.getRawAndEntities = async () => ({
      entities: rows,
      // The keyset columns as Postgres returns them: the timestamp at microsecond precision.
      raw: rows.map((r) => ({
        __keyset_0: `${r.createdAt.toISOString().slice(0, 23)}000`,
        __keyset_1: r.id,
      })),
    });
    return { repo: { createQueryBuilder: () => qb }, calls };
  };

  it("filters by user and token, returns one page and the next cursor, never the fingerprint", async () => {
    const { repo, calls } = builder([row(0), row(1), row(2)]);
    const service = new AgentAuditService(repo as never);
    const page = await service.listForToken("u1", "t1", { limit: 2 });
    expect(calls).toContainEqual(["where", ["e.userId = :userId", { userId: "u1" }]]);
    expect(calls).toContainEqual(["andWhere", ["e.tokenId = :tokenId", { tokenId: "t1" }]]);
    expect(calls).toContainEqual(["orderBy", ['"e"."created_at"', "DESC"]]);
    expect(calls).toContainEqual(["addOrderBy", ['"e"."id"', "DESC"]]);
    expect(calls).toContainEqual(["limit", [3]]);
    expect(page.items).toHaveLength(2);
    // The cursor is the last row's (created_at, id), like every other list's.
    expect(decodeCursor(page.nextCursor as string, ACTIVITY_KEYS)).toEqual([
      `${row(1).createdAt.toISOString().slice(0, 23)}000`,
      row(1).id,
    ]);
    expect(JSON.stringify(page)).not.toContain("f".repeat(64));
  });

  it("pages with a compound (created_at, id) comparison and ends with a null cursor", async () => {
    const { repo, calls } = builder([row(0)]);
    const service = new AgentAuditService(repo as never);
    const cursor = encodeCursor([`${row(5).createdAt.toISOString().slice(0, 23)}000`, row(5).id]);
    const page = await service.listForToken("u1", "t1", { limit: 500, cursor });
    expect(calls).toContainEqual(["limit", [501]]);
    const compound = calls.find(
      ([m, a]) => m === "andWhere" && String(a[0]).includes("created_at"),
    );
    expect(String(compound?.[1][0])).toMatch(/\("e"\."created_at", "e"\."id"\) </);
    expect(compound?.[1][1]).toMatchObject({ __keyset1: row(5).id });
    expect(page.nextCursor).toBeNull();
  });

  it("a cursor that is not ours is a 400 and nothing is read", async () => {
    const { repo, calls } = builder([row(0)]);
    const service = new AgentAuditService(repo as never);
    for (const bad of ["!!", encodeCursor(["not-a-date", "not-a-uuid"])]) {
      await expect(
        service.listForToken("u1", "t1", { limit: 10, cursor: bad }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(calls.some(([m]) => m === "limit")).toBe(false);
  });

  it("keeps a precomputed fingerprint only when it is 64 hex characters", async () => {
    const { service, insert } = make();
    await service.record({
      userId: "u",
      toolName: "x",
      outcome: "ok",
      latencyMs: 1,
      responseBytes: 1,
      argsFingerprint: "a".repeat(64),
    });
    await service.record({
      userId: "u",
      toolName: "x",
      outcome: "ok",
      latencyMs: 1,
      responseBytes: 1,
      argsFingerprint: "nope",
    });
    expect(insert.mock.calls[0]?.[0].argsFingerprint).toBe("a".repeat(64));
    expect(insert.mock.calls[1]?.[0].argsFingerprint).toBeNull();
  });
});
