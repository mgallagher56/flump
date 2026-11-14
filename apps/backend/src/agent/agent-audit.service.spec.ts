import type { Repository } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import type { AgentAuditEvent } from "../entities/agent-audit-event.entity";
import { AgentAuditService } from "./agent-audit.service";

const make = () => {
  const insert = vi.fn().mockResolvedValue(undefined);
  const del = vi.fn().mockResolvedValue({ affected: 3 });
  const repo = { insert, delete: del } as unknown as Repository<AgentAuditEvent>;
  return { service: new AgentAuditService(repo), insert, del };
};

describe("AgentAuditService (E17-N17)", () => {
  it("fingerprints arguments with HMAC-SHA256 only when a key is set", () => {
    const { service } = make();
    const a = service.fingerprint({ x: 1 }, "k");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(service.fingerprint({ x: 1 }, "k")).toBe(a);
    expect(service.fingerprint({ x: 2 }, "k")).not.toBe(a);
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

  it("purges with a cutoff 13 months back", async () => {
    const { service, del } = make();
    expect(await service.purgeOlderThan13Months(new Date("2026-11-14T00:00:00Z"))).toBe(3);
    const [where] = del.mock.calls[0] as [{ createdAt: { value: Date } }];
    const cutoff = where.createdAt.value;
    expect(cutoff.getFullYear()).toBe(2025);
    expect(cutoff.getMonth()).toBe(9);
  });
});
