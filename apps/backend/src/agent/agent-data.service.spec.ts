import { describe, expect, it, vi } from "vitest";
import { AgentDataService } from "./agent-data.service";

describe("AgentDataService.getUserFinancialData never exposes receipts (E20-N16, E17-N7)", () => {
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

  function build() {
    const taxFind = vi.fn(async () => [record]);
    const service = new AgentDataService(
      { find: vi.fn(async () => []) } as never,
      { find: taxFind } as never,
      {} as never,
      { getAccounts: async () => [], getAccountDetails: async () => [] } as never,
      { getProfile: async () => ({}) } as never,
    );
    return { service, taxFind };
  }

  it("has no receipt* key in the provider output", async () => {
    const data = await build().service.getUserFinancialData("u1");
    const records = (data.taxRecords ?? []) as unknown as Record<string, unknown>[];
    expect(records).toHaveLength(1);
    for (const r of records) {
      expect(Object.keys(r).filter((k) => k.startsWith("receipt"))).toEqual([]);
    }
    const json = JSON.stringify(data.taxRecords);
    expect(json).not.toContain("BASE64BLOB");
    expect(json).not.toContain("receipt");
    expect(json).not.toContain("userId");
    expect(records[0]).toMatchObject({ id: "t1", name: "Train", amount: 12 });
  });

  it("selects tax-record columns explicitly, with no receipt column", async () => {
    const { service, taxFind } = build();
    await service.getUserFinancialData("u1");
    const opts = (taxFind.mock.calls[0] as unknown as [{ select: Record<string, boolean> }])[0];
    expect(opts.select.id).toBe(true);
    expect(Object.keys(opts.select).filter((c) => c.startsWith("receipt"))).toEqual([]);
  });
});
