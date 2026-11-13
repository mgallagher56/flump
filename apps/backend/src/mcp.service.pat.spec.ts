import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { McpService } from "./mcp.service";

const nothing = {} as never;

function buildTokenService() {
  const repo = {
    create: (v: any) => ({ ...v }),
    save: vi.fn(async (v: any) => ({ id: "tok_new", createdAt: new Date(), ...v })),
  };
  const service = new McpService(
    repo as never,
    nothing,
    nothing,
    nothing,
    nothing,
    nothing,
    nothing,
    nothing,
    nothing,
    { get: vi.fn() } as never,
    "workos",
  );
  return { service, repo };
}

describe("McpService.createPatToken lifecycle rules (E20-N16)", () => {
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

describe("McpService.getUserFinancialData never exposes receipts (E20-N16)", () => {
  it("strips receiptData, receiptFilename and receiptMimeType from tax records", async () => {
    const record = {
      id: "t1",
      userId: "u1",
      type: "expense",
      source: "self-employed",
      category: "travel",
      name: "Train",
      amount: 12,
      frequency: "one-off",
      date: "2026-01-01",
      endDate: null,
      notes: null,
      receiptFilename: "r.pdf",
      receiptMimeType: "application/pdf",
      receiptData: "BASE64BLOB",
    };
    const service = new McpService(
      nothing,
      nothing,
      nothing,
      nothing,
      { find: vi.fn(async () => []) } as never,
      { find: vi.fn(async () => [record]) } as never,
      nothing,
      { getAccounts: async () => [], getAccountDetails: async () => [] } as never,
      { getProfile: async () => ({}) } as never,
      { get: vi.fn() } as never,
      "workos",
    );
    const data = await service.getUserFinancialData("u1");
    const json = JSON.stringify(data.taxRecords);
    expect(json).not.toContain("BASE64BLOB");
    expect(json).not.toContain("receipt");
    expect(data.taxRecords?.[0]).toMatchObject({ id: "t1", name: "Train", amount: 12 });
  });
});
