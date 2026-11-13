import { describe, expect, it, vi } from "vitest";
import { ExpireLegacyMcpTokens1794355700000 } from "./ExpireLegacyMcpTokens1794355700000";

describe("ExpireLegacyMcpTokens", () => {
  it("backfills expiry from created_at and anonymises, only for the legacy rows", async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    await new ExpireLegacyMcpTokens1794355700000().up({ query } as never);
    const sql = query.mock.calls.map((c) => String(c[0]));
    expect(
      sql.some((q) => q.includes("INTERVAL '90 days'") && q.includes('"expires_at" IS NULL')),
    ).toBe(true);
    expect(
      sql.some((q) => q.includes('"anonymize_institutions" = true') && q.includes("= false")),
    ).toBe(true);
  });
});
