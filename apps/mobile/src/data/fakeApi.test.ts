import { CreateBudgetEntryRequest } from "@flump/api-contract";
import { fakeApi } from "./fakeApi";

/** The fake refuses what the backend would, so tests cannot pass on a body it rejects. */
describe("the fake /v1", () => {
  const body = { category: "bills", name: "Water", amount: 25 };

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

  it("finds each write's schema by its route's shape: an id, a named route, a month", async () => {
    const route = jest.fn(() => ({}));
    const { request } = fakeApi({
      "PATCH /accounts/abc": route,
      "POST /accounts/mortgage-with-property": route,
      "PUT /snapshots/2026-11": route,
      "GET /accounts/abc": route,
    });
    for (const [method, path] of [
      ["PATCH", "/accounts/abc"],
      ["POST", "/accounts/mortgage-with-property"],
      ["PUT", "/snapshots/2026-11"],
    ] as const) {
      await expect(
        request(path, { method, body: { unknownKey: true }, idempotencyKey: "k" }),
      ).rejects.toMatchObject({ kind: "client", status: 400 });
    }
    expect(route).not.toHaveBeenCalled();
    // A read has no request schema: it reaches its route.
    await request("/accounts/abc", {});
    expect(route).toHaveBeenCalledTimes(1);
  });
});
