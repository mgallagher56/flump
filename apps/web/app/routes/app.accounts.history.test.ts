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

  it("returns saved accounts, history, the London month, surplus and months of cover", async () => {
    loadWorkspaceSnapshot.mockResolvedValue({
      accounts,
      accountDetails: [{ accountId: "a1", year: 2026, month: 10, value: 3000 }],
      budgetEntries: [
        { isIncome: true, amount: 2500, frequency: "monthly" },
        { isIncome: false, isEssential: true, amount: 1000, frequency: "monthly" },
      ],
    });
    const data = await run();
    expect(loadWorkspaceSnapshot).toHaveBeenCalledWith(args, { includeBudget: true });
    expect(data.currentMonth).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    expect(data.monthlySurplus).toBe(1500);
    expect(data.monthsOfCover).toBe(3);
    expect(data.accounts).toBe(accounts);
  });

  it("leaves surplus and cover unknown without a budget, never zero", async () => {
    loadWorkspaceSnapshot.mockResolvedValue({ accounts, accountDetails: [], budgetEntries: [] });
    const data = await run();
    expect(data.monthlySurplus).toBeNull();
    expect(data.monthsOfCover).toBeNull();
  });
});
