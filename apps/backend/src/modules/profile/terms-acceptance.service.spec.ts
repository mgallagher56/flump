import { describe, expect, it, vi } from "vitest";
import { AGREED_CACHE_MS, newestPair, TermsAcceptanceService } from "./terms-acceptance.service";

// LEGAL_PAGES today (packages/business-details): terms 0.1 (from 2026-11-25); privacy notice 0.2
// (from 2026-11-25) and 0.1 before it. So on 2026-11-26 the pair in force is terms 0.1 with
// privacy 0.2, and only privacy 0.2 satisfies the notice (0.1 is older than the one in force).
const NOW = new Date("2026-11-26T12:00:00Z");

type Row = {
  userId: string;
  termsVersionAgreed: string;
  privacyNoticeVersionShown: string;
  acceptedAt: Date;
};

function serviceWith(rows: Row[]) {
  const matches = (where: Record<string, unknown>, row: Row) =>
    Object.entries(where).every(([key, value]) => {
      const cell = row[key as keyof Row];
      // TypeORM's In() operator carries its list in `_value`.
      const list = (value as { _value?: unknown[] })?._value;
      return list ? list.includes(cell) : cell === value;
    });
  const count = vi.fn(
    async ({ where }: { where: Record<string, unknown> }) =>
      rows.filter((row) => matches(where, row)).length,
  );
  const find = vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
    rows
      .filter((row) => matches(where, row))
      .sort((a, b) => b.acceptedAt.getTime() - a.acceptedAt.getTime()),
  );
  const execute = vi.fn(async () => ({ raw: [{}] }));
  const builder = {
    insert: () => builder,
    into: () => builder,
    values: vi.fn(() => builder),
    orIgnore: () => builder,
    execute,
  };
  const manager = {
    transaction: vi.fn(async (work: (m: unknown) => unknown) =>
      work({ createQueryBuilder: () => builder }),
    ),
  };
  const repository = { count, find, manager };
  return { service: new TermsAcceptanceService(repository as never), count, builder, manager };
}

const row = (userId: string, terms: string, privacy: string, at = "2026-11-25T10:00:00Z"): Row => ({
  userId,
  termsVersionAgreed: terms,
  privacyNoticeVersionShown: privacy,
  acceptedAt: new Date(at),
});

describe("TermsAcceptanceService.hasAgreedToTermsInForce", () => {
  it("is true for the pair in force and false with no row", async () => {
    const { service } = serviceWith([row("u1", "0.1", "0.2")]);
    expect(await service.hasAgreedToTermsInForce("u1", NOW)).toBe(true);
    expect(await service.hasAgreedToTermsInForce("u2", NOW)).toBe(false);
  });

  it("does not count an agreement shown an older privacy notice than the one in force", async () => {
    const { service } = serviceWith([row("u1", "0.1", "0.1")]);
    expect(await service.hasAgreedToTermsInForce("u1", NOW)).toBe(false);
  });

  it("caches a yes for 30 seconds and never caches a no", async () => {
    const rows: Row[] = [];
    const { service, count } = serviceWith(rows);
    expect(await service.hasAgreedToTermsInForce("u1", NOW)).toBe(false);
    expect(await service.hasAgreedToTermsInForce("u1", NOW)).toBe(false);
    expect(count).toHaveBeenCalledTimes(2);

    rows.push(row("u1", "0.1", "0.2"));
    expect(await service.hasAgreedToTermsInForce("u1", NOW)).toBe(true);
    // Within the time limit: answered from the cache, even after the row is gone.
    rows.length = 0;
    const justBefore = new Date(NOW.getTime() + AGREED_CACHE_MS - 1);
    expect(await service.hasAgreedToTermsInForce("u1", justBefore)).toBe(true);
    expect(count).toHaveBeenCalledTimes(3);
    // At the limit the table is read again.
    const atLimit = new Date(NOW.getTime() + AGREED_CACHE_MS);
    expect(await service.hasAgreedToTermsInForce("u1", atLimit)).toBe(false);
    expect(count).toHaveBeenCalledTimes(4);
  });

  it("propagates a failed read, so the guard can fail closed", async () => {
    const { service, count } = serviceWith([]);
    count.mockRejectedValueOnce(new Error("connection refused"));
    await expect(service.hasAgreedToTermsInForce("u1", NOW)).rejects.toThrow("connection refused");
  });
});

describe("TermsAcceptanceService.status", () => {
  it("asks a person with no agreement to agree, for the first time", async () => {
    const { service } = serviceWith([]);
    const status = await service.status("u1", NOW);
    expect(status).toMatchObject({ required: true, agreed: false, firstTime: true });
    expect(status.terms).toEqual({
      version: "0.1",
      updated: "25 November 2026",
      effectiveFrom: "2026-11-25",
      path: "/terms",
      changed: false,
    });
    expect(status.privacyNotice).toMatchObject({
      version: "0.2",
      path: "/privacy",
      changed: false,
    });
  });

  it("marks only the privacy notice changed for someone who agreed under privacy 0.1", async () => {
    const { service } = serviceWith([row("u1", "0.1", "0.1")]);
    const status = await service.status("u1", NOW);
    expect(status).toMatchObject({ required: true, agreed: false, firstTime: false });
    expect(status.terms.changed).toBe(false);
    expect(status.privacyNotice.changed).toBe(true);
  });

  it("reads the latest agreement when there are several", async () => {
    const { service } = serviceWith([
      row("u1", "0.1", "0.1", "2026-11-20T10:00:00Z"),
      row("u1", "0.1", "0.2", "2026-11-26T09:00:00Z"),
    ]);
    const status = await service.status("u1", NOW);
    expect(status).toMatchObject({ required: false, agreed: true, firstTime: false });
    expect(status.privacyNotice.changed).toBe(false);
  });
});

describe("TermsAcceptanceService.accept", () => {
  it("inserts the pair once, in a transaction, and reports whether it wrote", async () => {
    const { service, builder, manager } = serviceWith([]);
    await expect(service.accept("u1", newestPair())).resolves.toEqual({ recorded: true });
    expect(manager.transaction).toHaveBeenCalledTimes(1);
    expect(builder.values).toHaveBeenCalledWith({
      userId: "u1",
      termsVersionAgreed: "0.1",
      privacyNoticeVersionShown: "0.2",
    });
    builder.execute.mockResolvedValueOnce({ raw: [] });
    await expect(service.accept("u1", newestPair())).resolves.toEqual({ recorded: false });
  });
});
