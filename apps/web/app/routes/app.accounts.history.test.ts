import { beforeEach, describe, expect, it, vi } from "vitest";

const loadWorkspaceSnapshot = vi.fn();
vi.mock("~/services/backend-client.server", () => ({
  loadWorkspaceSnapshot: (...a: unknown[]) => loadWorkspaceSnapshot(...a),
}));

const { loader } = await import("./app.accounts.history");

const args = { request: new Request("http://app.test/app/accounts/history"), params: {} } as never;
const accounts = [{ id: "a1", name: "Easy access", type: "Saving", balance: 3000 }];

async function run() {
  const res = (await loader(args)) as unknown as { data: Record<string, unknown> };
  return res.data;
}

describe("app.accounts.history loader", () => {
  beforeEach(() => loadWorkspaceSnapshot.mockReset());

  it("returns saved accounts, history and the London month, and no budget figures", async () => {
    loadWorkspaceSnapshot.mockResolvedValue({
      accounts,
      accountDetails: [{ accountId: "a1", year: 2026, month: 10, value: 3000 }],
      budgetEntries: [],
    });
    const data = await run();
    expect(loadWorkspaceSnapshot).toHaveBeenCalledWith(args);
    expect(data.currentMonth).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    expect(data.accounts).toBe(accounts);
    expect(data.accountDetails).toEqual([{ accountId: "a1", year: 2026, month: 10, value: 3000 }]);
    // Months of cover belongs to Budget now (E16 PR 5).
    expect(data).not.toHaveProperty("monthsOfCover");
    expect(data).not.toHaveProperty("monthlySurplus");
  });
});
