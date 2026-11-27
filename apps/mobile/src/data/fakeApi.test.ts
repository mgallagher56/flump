import { CreateBudgetEntryRequest } from "@flump/api-contract";
import { fakeApi } from "./fakeApi";

/** The fake refuses what the phone's client or the backend would, so tests cannot pass on it. */
describe("the fake /v1", () => {
  const body = { category: "bills", name: "Water", amount: 25 };

  it("refuses a POST that names no Idempotency-Key, as the client does on Hermes", async () => {
    const { request } = fakeApi({ "POST /budget-entries": () => ({}) });
    await expect(request("/budget-entries", { method: "POST", body })).rejects.toThrow(
      /names no idempotencyKey/,
    );
    // `false` (no key at all, as sign-out sends) and a named key both go through.
    await request("/budget-entries", { method: "POST", body, idempotencyKey: false });
    await request("/budget-entries", { method: "POST", body, idempotencyKey: "k" });
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("answers 400 to a write body the contract's strict schema refuses", async () => {
    const route = jest.fn(() => ({}));
    const { request } = fakeApi({
      "POST /budget-entries": route,
      "PATCH /budget-entries/a": route,
    });
    const bad = { ...body, isPrimaryIncome: true };
    expect(CreateBudgetEntryRequest.safeParse(bad).success).toBe(false);
    await expect(
      request("/budget-entries", { method: "POST", body: bad, idempotencyKey: "k" }),
    ).rejects.toMatchObject({ kind: "client", status: 400 });
    await expect(
      request("/budget-entries/a", { method: "PATCH", body: { amount: "12" } }),
    ).rejects.toMatchObject({ kind: "client", status: 400 });
    expect(route).not.toHaveBeenCalled();
  });
});
