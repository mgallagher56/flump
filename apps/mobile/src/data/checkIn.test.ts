import { randomUUID } from "node:crypto";
import { putSnapshot } from "./checkIn";
import { fakeApi } from "./fakeApi";

describe("putSnapshot", () => {
  it("refuses a body the contract would refuse, before any request", async () => {
    const api = fakeApi({});
    // Not a UUID: UpsertSnapshotRequest rejects it.
    await expect(
      putSnapshot(api.client, "2026-11", { values: [{ accountId: "nope", value: 1 }] }),
    ).rejects.toThrow();
    expect(api.request).not.toHaveBeenCalled();
  });

  it("sends a PUT to /snapshots/:month with the body as given", async () => {
    const accountId = randomUUID();
    const api = fakeApi({
      "PUT /snapshots/2026-11": () => ({
        month: "2026-11",
        values: [{ accountId, value: 5, asOfDate: "2026-11-20", source: "manual" }],
        completed: false,
      }),
    });
    await putSnapshot(api.client, "2026-11", { values: [{ accountId, value: 5 }], checkIn: true });
    expect(api.calls).toEqual([
      {
        method: "PUT",
        path: "/snapshots/2026-11",
        body: { values: [{ accountId, value: 5 }], checkIn: true },
      },
    ]);
  });

  it("with no API client, fails without throwing a network error", async () => {
    await expect(putSnapshot(null, "2026-11", { values: [] })).rejects.toThrow("No API client");
  });
});
