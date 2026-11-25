import { legalPageFromHistory } from "@flump/business-details";
import { describe, expect, it, vi } from "vitest";
import { AGREED_CACHE_MS, newestPair, TermsAcceptanceService } from "./terms-acceptance.service";

// LEGAL_PAGES today (packages/business-details): terms 0.1 (from 2026-11-25); privacy notice 0.3
// (from 2026-11-25), with 0.2 and 0.1 before it. So on 2026-11-26 the pair in force is terms 0.1
// with privacy 0.3, and only privacy 0.3 satisfies the notice (0.2 and 0.1 are older).
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
  // Honours `where` and `order` as the database would: unsorted unless asked for newest first.
  const find = vi.fn(
    async ({
      where,
      order,
    }: {
      where: Record<string, unknown>;
      order?: Record<string, string>;
    }) => {
      const found = rows.filter((row) => matches(where, row));
      return order?.acceptedAt === "DESC"
        ? found.sort((a, b) => b.acceptedAt.getTime() - a.acceptedAt.getTime())
        : found;
    },
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
    const { service } = serviceWith([row("u1", "0.1", "0.3")]);
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

    rows.push(row("u1", "0.1", "0.3"));
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

  it("forgets the oldest cached yes once 10,000 are held", async () => {
    // Everyone has agreed: a count of 1 for any user, without scanning 10,001 rows each time.
    const count = vi.fn(async () => 1);
    const service = new TermsAcceptanceService({ count } as never);
    for (let i = 0; i <= 10_000; i++) await service.hasAgreedToTermsInForce(`u${i}`, NOW);
    expect(count).toHaveBeenCalledTimes(10_001);
    // u0 was cached first and pushed out by u10000; u1 is still cached.
    await service.hasAgreedToTermsInForce("u1", NOW);
    expect(count).toHaveBeenCalledTimes(10_001);
    await service.hasAgreedToTermsInForce("u0", NOW);
    expect(count).toHaveBeenCalledTimes(10_002);
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
      version: "0.3",
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

  it("reads the caller's latest agreement when there are several", async () => {
    const { service } = serviceWith([
      row("u1", "0.1", "0.3", "2026-11-26T09:00:00Z"),
      row("u1", "0.1", "0.1", "2026-11-20T10:00:00Z"),
      // Another user's rows never count for u1.
      row("u2", "0.1", "0.1", "2026-11-26T11:00:00Z"),
    ]);
    const status = await service.status("u1", NOW);
    expect(status).toMatchObject({ required: false, agreed: true, firstTime: false });
    expect(status.privacyNotice.changed).toBe(false);
  });
});

describe("TermsAcceptanceService.status, agreed", () => {
  it("needs both the newest terms and the newest privacy notice", async () => {
    // Terms 0.0 is not the newest (0.1), even with the newest privacy notice.
    const { service } = serviceWith([row("u1", "0.0", "0.3")]);
    expect((await service.status("u1", NOW)).agreed).toBe(false);
  });

  it("orders by time when reading the latest agreement", async () => {
    // Stored oldest first: only an ordered read finds the 0.3 row as the latest.
    const { service } = serviceWith([
      row("u1", "0.1", "0.1", "2026-11-20T10:00:00Z"),
      row("u1", "0.1", "0.3", "2026-11-26T09:00:00Z"),
    ]);
    expect((await service.status("u1", NOW)).privacyNotice.changed).toBe(false);
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
      privacyNoticeVersionShown: "0.3",
    });
    builder.execute.mockResolvedValueOnce({ raw: [] });
    await expect(service.accept("u1", newestPair())).resolves.toEqual({ recorded: false });
  });
});

describe("TermsAcceptanceService with a terms change coming (a test history)", () => {
  // Terms 0.2 published, applying from 9 December 2026 (UK); 0.1 in force until then.
  const pages = [
    legalPageFromHistory({
      key: "terms",
      path: "/terms",
      label: "Terms",
      title: "Terms of use",
      history: [
        { version: "0.2", updated: "25 November 2026", effectiveFrom: "2026-12-09" },
        { version: "0.1", updated: "25 November 2026", effectiveFrom: "2026-11-25" },
      ],
    }),
    legalPageFromHistory({
      key: "privacy",
      path: "/privacy",
      label: "Privacy",
      title: "Privacy notice",
      history: [{ version: "0.2", updated: "25 November 2026", effectiveFrom: "2026-11-25" }],
    }),
  ];
  const withPages = (rows: Row[]) => {
    const made = serviceWith(rows);
    made.service.pages = pages;
    return made;
  };

  it("never answers from the cache once a new version comes into force", async () => {
    const { service, count } = withPages([row("u1", "0.1", "0.2")]);
    // Agreed to 0.1, cached ten seconds before midnight (GMT, so UK midnight is UTC midnight).
    expect(await service.hasAgreedToTermsInForce("u1", new Date("2026-12-08T23:59:50Z"))).toBe(
      true,
    );
    // Five seconds after midnight, well inside the 30-second limit: 0.2 is in force, read again.
    expect(await service.hasAgreedToTermsInForce("u1", new Date("2026-12-09T00:00:05Z"))).toBe(
      false,
    );
    expect(count).toHaveBeenCalledTimes(2);
  });

  it("counts an early agreement to the coming version, before and after its date", async () => {
    const { service } = withPages([row("u1", "0.2", "0.2")]);
    expect(await service.hasAgreedToTermsInForce("u1", new Date("2026-12-01T12:00:00Z"))).toBe(
      true,
    );
    expect(await service.hasAgreedToTermsInForce("u1", new Date("2026-12-10T12:00:00Z"))).toBe(
      true,
    );
  });

  it("offers the coming version without requiring it", async () => {
    const { service } = withPages([row("u1", "0.1", "0.2")]);
    const status = await service.status("u1", new Date("2026-12-01T12:00:00Z"));
    expect(status).toMatchObject({ required: false, agreed: false, firstTime: false });
    expect(status.terms).toMatchObject({
      version: "0.2",
      effectiveFrom: "2026-12-09",
      changed: true,
    });
    expect(status.privacyNotice.changed).toBe(false);
  });

  it("records the newest pair from its own pages", () => {
    expect(newestPair(pages)).toEqual({ termsVersion: "0.2", privacyNoticeVersion: "0.2" });
  });
});
