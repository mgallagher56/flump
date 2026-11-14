import { describe, expect, it, vi } from "vitest";
import { acceptTermsOnce } from "./consents";

/** A manager whose consents table holds the given open rows; inserts are captured. */
function managerWith(open: Array<{ userId: string; kind: string; version: string }>) {
  const rows = [...open];
  const insert = vi.fn(async (row: { userId: string; kind: string; version: string }) => {
    rows.push(row);
  });
  const count = vi.fn(
    async ({ where }: { where: { userId: string; kind: string; version: string } }) =>
      rows.filter(
        (r) => r.userId === where.userId && r.kind === where.kind && r.version === where.version,
      ).length,
  );
  return { manager: { getRepository: () => ({ count, insert }) } as never, insert, rows };
}

describe("acceptTermsOnce (BE-15, M-PRIV3)", () => {
  it("writes one terms row for a first acceptance", async () => {
    const { manager, insert } = managerWith([]);
    await expect(acceptTermsOnce(manager, { userId: "u1", version: "2026-11-01" })).resolves.toBe(
      true,
    );
    expect(insert).toHaveBeenCalledWith({
      userId: "u1",
      kind: "terms",
      version: "2026-11-01",
      targetId: null,
      withdrawnAt: null,
    });
  });

  it("is idempotent per user and version", async () => {
    const { manager, insert } = managerWith([]);
    await acceptTermsOnce(manager, { userId: "u1", version: "2026-11-01" });
    await expect(acceptTermsOnce(manager, { userId: "u1", version: "2026-11-01" })).resolves.toBe(
      false,
    );
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("writes a new row for a new version and for another user", async () => {
    const { manager, rows } = managerWith([{ userId: "u1", kind: "terms", version: "2026-11-01" }]);
    await expect(acceptTermsOnce(manager, { userId: "u1", version: "2027-01-01" })).resolves.toBe(
      true,
    );
    await expect(acceptTermsOnce(manager, { userId: "u2", version: "2026-11-01" })).resolves.toBe(
      true,
    );
    expect(rows.map((r) => `${r.userId}:${r.version}`)).toEqual([
      "u1:2026-11-01",
      "u1:2027-01-01",
      "u2:2026-11-01",
    ]);
  });

  it("does not count another consent kind with the same version as accepted terms", async () => {
    const { manager } = managerWith([{ userId: "u1", kind: "ai_access", version: "2026-11-01" }]);
    await expect(acceptTermsOnce(manager, { userId: "u1", version: "2026-11-01" })).resolves.toBe(
      true,
    );
  });
});
