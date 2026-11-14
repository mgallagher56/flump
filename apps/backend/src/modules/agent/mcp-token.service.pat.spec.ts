import { WRITE_STAGE_SCOPE as ContractWriteStageScope } from "@flump/api-contract";
import { WRITE_STAGE_SCOPE } from "@flump/mcp";
import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AuditEvent } from "../../entities/audit-event.entity";
import { Consent } from "../../entities/consent.entity";
import { McpToken } from "../../entities/mcp-token.entity";
import { McpTokenService } from "./mcp-token.service";

function buildTokenService() {
  const repo = {
    create: (v: Record<string, unknown>) => ({ ...v }),
    save: vi.fn(async (v: Record<string, unknown>) => ({
      id: "tok_new",
      createdAt: new Date(),
      ...v,
    })),
    manager: {} as unknown,
  };
  const auditInsert = vi.fn(async () => undefined);
  const consentInsert = vi.fn(async () => undefined);
  const consentUpdate = vi.fn(async () => ({ affected: 1 }));
  const tokenUpdate = vi.fn(async () => ({ affected: 1 }));
  const m = {
    getRepository: (entity: unknown) => {
      if (entity === McpToken) return { save: repo.save, update: tokenUpdate };
      if (entity === AuditEvent) return { insert: auditInsert };
      if (entity === Consent) return { insert: consentInsert, update: consentUpdate };
      throw new Error("unexpected repository");
    },
  };
  repo.manager = { transaction: async (fn: (m: unknown) => unknown) => fn(m) };
  const service = new McpTokenService(repo as never);
  return { service, repo, auditInsert, consentInsert, consentUpdate, tokenUpdate };
}

describe("McpTokenService audit trail (BE-06)", () => {
  it("records mcp_token.minted and an ai_access consent when a token is created", async () => {
    const { service, auditInsert, consentInsert } = buildTokenService();
    await service.createPatToken("u1", "Cursor");
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", action: "mcp_token.minted" }),
    );
    expect(consentInsert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", kind: "ai_access", targetId: "tok_new" }),
    );
  });

  it("records mcp_token.revoked and withdraws the consent when a token is revoked", async () => {
    const { service, repo, auditInsert, consentUpdate, tokenUpdate } = buildTokenService();
    Object.assign(repo, {
      findOne: vi.fn(async () => ({ id: "tok_1", userId: "u1", revokedAt: null })),
    });
    await service.revokeToken("u1", "tok_1");
    expect(tokenUpdate).toHaveBeenCalled();
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "mcp_token.revoked" }),
    );
    expect(consentUpdate).toHaveBeenCalled();
  });

  it("writes nothing when the token is already revoked", async () => {
    const { service, repo, auditInsert, consentUpdate, tokenUpdate } = buildTokenService();
    Object.assign(repo, {
      findOne: vi.fn(async () => ({
        id: "tok_1",
        userId: "u1",
        revokedAt: new Date(),
      })),
    });
    await expect(service.revokeToken("u1", "tok_1")).resolves.toEqual({ success: true });
    expect(tokenUpdate).not.toHaveBeenCalled();
    expect(auditInsert).not.toHaveBeenCalled();
    expect(consentUpdate).not.toHaveBeenCalled();
  });
});

describe("McpTokenService.createPatToken lifecycle rules (E20-N16)", () => {
  it("defaults expiry to 90 days when none is given", async () => {
    const { service } = buildTokenService();
    const before = Date.now();
    const res = await service.createPatToken("u1", "Cursor");
    const days = ((res.expiresAt as Date).getTime() - before) / 86_400_000;
    expect(days).toBeGreaterThan(89.99);
    expect(days).toBeLessThan(90.01);
  });

  it.each([7, 30, 90, 365])("accepts %i days", async (d) => {
    const { service } = buildTokenService();
    const res = await service.createPatToken("u1", "Cursor", { expiryDays: d });
    expect(res.expiresAt).toBeInstanceOf(Date);
  });

  it.each([null, 0, -1, 1, 45, 366, Number.NaN])("rejects expiryDays %s with 400", async (d) => {
    const { service, repo } = buildTokenService();
    await expect(
      service.createPatToken("u1", "Cursor", { expiryDays: d as number | null }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("trims the name and rejects empty or over-64-character names", async () => {
    const { service } = buildTokenService();
    const ok = await service.createPatToken("u1", "  Cursor  ");
    expect(ok.name).toBe("Cursor");
    await expect(service.createPatToken("u1", "   ")).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createPatToken("u1", "x".repeat(65))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    const max = await service.createPatToken("u1", "x".repeat(64));
    expect(max.name).toHaveLength(64);
  });

  it("rejects anonymizeInstitutions:false with an explanation, accepts true or omitted", async () => {
    const { service, repo } = buildTokenService();
    await expect(
      service.createPatToken("u1", "Cursor", { anonymizeInstitutions: false }),
    ).rejects.toThrow(/step-up/i);
    expect(repo.save).not.toHaveBeenCalled();
    const a = await service.createPatToken("u1", "A", { anonymizeInstitutions: true });
    const b = await service.createPatToken("u1", "B");
    expect(a.anonymizeInstitutions).toBe(true);
    expect(b.anonymizeInstitutions).toBe(true);
  });
});

describe("McpTokenService.createPatToken name hygiene (E20-N16)", () => {
  it.each(["a\u0000b", "a\nb", "a\u200bb", "a\u202eb", "a\u2028b", "a\u2029b"])(
    "rejects control or invisible characters in %j",
    async (n) => {
      const { service } = buildTokenService();
      await expect(service.createPatToken("u1", n)).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it("normalises the name to NFC", async () => {
    const { service } = buildTokenService();
    const res = await service.createPatToken("u1", "Cafe\u0301");
    expect(res.name).toBe("Caf\u00e9");
  });
});

describe("McpTokenService.createPatToken type guards (E20-N16)", () => {
  it.each([undefined, null, 5, {}, ["a"]])("rejects non-string name %s with 400", async (n) => {
    const { service } = buildTokenService();
    await expect(service.createPatToken("u1", n as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it.each(["90", "7", true, {}])("rejects non-number expiryDays %s with 400", async (d) => {
    const { service } = buildTokenService();
    await expect(
      service.createPatToken("u1", "A", { expiryDays: d as never }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each(["false", "true", 0, 1, null])(
    "rejects non-boolean anonymizeInstitutions %s with 400",
    async (a) => {
      const { service } = buildTokenService();
      await expect(
        service.createPatToken("u1", "A", { anonymizeInstitutions: a as never }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );
});

describe("McpTokenService write:stage opt-in (E17 re-plan PR D)", () => {
  it("the contract's scope string matches the MCP package's (one value, two exports)", () => {
    expect(ContractWriteStageScope).toBe(WRITE_STAGE_SCOPE);
    expect(WRITE_STAGE_SCOPE).toBe("write:stage");
  });

  it("is off by default: read and simulate only", async () => {
    const { service } = buildTokenService();
    expect((await service.createPatToken("u1", "Reader")).scopes).toEqual([
      "mcp:read:anonymized",
      "mcp:simulate",
    ]);
    expect(
      (await service.createPatToken("u1", "Reader", { allowStaging: false })).scopes,
    ).not.toContain("write:stage");
  });

  it("adds write:stage, and nothing else, when allowStaging is true", async () => {
    const { service, repo } = buildTokenService();
    const res = await service.createPatToken("u1", "Stager", { allowStaging: true });
    expect(res.scopes).toEqual(["mcp:read:anonymized", "mcp:simulate", "write:stage"]);
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ scopes: ["mcp:read:anonymized", "mcp:simulate", "write:stage"] }),
    );
  });

  it.each(["true", 1, null])("rejects a non-boolean allowStaging (%s) with 400", async (v) => {
    const { service, repo } = buildTokenService();
    await expect(
      service.createPatToken("u1", "Stager", { allowStaging: v as never }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
