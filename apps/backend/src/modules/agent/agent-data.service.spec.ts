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
      {} as never,
      {} as never,
      { findOne: async () => null } as never,
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

describe("AgentDataService.getUserFinancialData profile facts (E23)", () => {
  function serviceWith(profile: Record<string, unknown>) {
    return new AgentDataService(
      { find: vi.fn(async () => []) } as never,
      { find: vi.fn(async () => []) } as never,
      {} as never,
      { getAccounts: async () => [], getAccountDetails: async () => [] } as never,
      { getProfile: async () => profile } as never,
      {} as never,
      {} as never,
      { findOne: async () => null } as never,
    );
  }

  it("passes saved facts through without the baseline's defaults", async () => {
    const data = await serviceWith({}).getUserFinancialData("u1");
    expect(data.profileFacts).toEqual({
      annualSalary: null,
      employmentType: null,
      taxRegion: null,
      studentLoanPlans: null,
      pensionPercent: null,
      isSalarySacrifice: null,
      housingStatus: null,
      monthlyHousingCost: null,
      mortgageType: null,
      propertyOwnershipShare: null,
    });
  });

  it("carries the saved net worth choices, and the defaults when none are saved", async () => {
    expect((await serviceWith({}).getUserFinancialData("u1")).netWorthBasis).toEqual({
      countProperty: true,
      countStudentLoan: false,
    });
    const saved = { netWorthCountsProperty: false, netWorthCountsStudentLoan: true };
    expect((await serviceWith(saved).getUserFinancialData("u1")).netWorthBasis).toEqual({
      countProperty: false,
      countStudentLoan: true,
    });
    expect(await serviceWith(saved).getNetWorthBasis("u1")).toEqual({
      countProperty: false,
      countStudentLoan: true,
    });
  });

  it("maps a saved salary, region and pension", async () => {
    const data = await serviceWith({
      annualSalary: "38000",
      employmentType: "employed",
      taxRegion: "SCOTLAND",
      studentLoanPlans: ["PLAN_2"],
      pensionPercent: 5,
      isSalarySacrifice: false,
    }).getUserFinancialData("u1");
    expect(data.profileFacts).toMatchObject({
      annualSalary: 38000,
      taxRegion: "SCOTLAND",
      studentLoanPlans: ["PLAN_2"],
      pensionPercent: 5,
    });
  });
});

describe("AgentDataService.getUserFinancialData retirement plan and birth year (E33)", () => {
  const savedRow = {
    id: "plan-1",
    userId: "u1",
    retirementAge: 66,
    planToAge: 95,
    target: { kind: "typed", yearlyAmount: 24000 },
    housingOverride: null,
    statePensionAge: 67,
    // numericTransformer turns decimal columns into numbers; the shared formatter also
    // converts the rate columns itself, so a string that slipped through still arrives as a number.
    statePensionAnnualForecastGbp: 11502.4,
    statePensionQualifyingYears: 30,
    growthRates: { lower: 0.02, middle: 0.05, higher: 0.08 },
    inflationRate: "0.0250",
    cashSavingsNominalRate: null,
    realRentGrowthRate: "0.0100",
    excludedAccountIds: ["acc-2"],
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-02-01T00:00:00Z"),
  };

  function serviceWith(profile: Record<string, unknown>, row: Record<string, unknown> | null) {
    const writes = { save: vi.fn(), insert: vi.fn(), upsert: vi.fn(), update: vi.fn() };
    const findOne = vi.fn(async () => row);
    const service = new AgentDataService(
      { find: vi.fn(async () => []) } as never,
      { find: vi.fn(async () => []) } as never,
      {} as never,
      { getAccounts: async () => [], getAccountDetails: async () => [] } as never,
      { getProfile: async () => profile } as never,
      {} as never,
      {} as never,
      { findOne, ...writes } as never,
    );
    return { service, findOne, writes };
  }

  it("carries the saved plan with numeric figures and the saved birth year, scoped by user", async () => {
    const { service, findOne } = serviceWith({ birthYear: 1970 }, savedRow);
    const data = await service.getUserFinancialData("u1");
    expect(findOne).toHaveBeenCalledWith({ where: { userId: "u1" } });
    expect(data.birthYear).toBe(1970);
    expect(data.retirementPlan).toEqual({
      retirementAge: 66,
      planToAge: 95,
      target: { kind: "typed", yearlyAmount: 24000 },
      housingOverride: null,
      statePensionAge: 67,
      statePensionAnnualForecastGbp: 11502.4,
      statePensionQualifyingYears: 30,
      growthRates: { lower: 0.02, middle: 0.05, higher: 0.08 },
      inflationRate: 0.025,
      cashSavingsNominalRate: null,
      realRentGrowthRate: 0.01,
      excludedAccountIds: ["acc-2"],
    });
    // No row id, user id or timestamps go to the tools.
    expect(JSON.stringify(data.retirementPlan)).not.toContain("u1");
  });

  it("leaves the plan null and writes nothing when none is saved", async () => {
    const { service, writes } = serviceWith({}, null);
    const data = await service.getUserFinancialData("u1");
    expect(data.retirementPlan).toBeNull();
    expect(data.birthYear).toBeNull();
    for (const fn of Object.values(writes)) expect(fn).not.toHaveBeenCalled();
  });
});

describe("AgentDataService ranged MCP reads (E17 re-plan PR B, unit)", () => {
  function build(query = vi.fn(async (): Promise<unknown[]> => [])) {
    const qb = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn(async () => []),
    };
    const accountFind = vi.fn(async () => [
      {
        id: "a1",
        name: "n",
        type: "Mortgage",
        balance: "10.5",
        interestRate: null,
        monthlyContribution: "3",
        termMonths: 12,
        fixedRateEndDate: null,
        currency: "GBP",
        isCurrent: null,
      },
    ]);
    const service = new AgentDataService(
      {} as never,
      { createQueryBuilder: () => qb } as never,
      {} as never,
      {} as never,
      { getProfile: async () => ({}) } as never,
      { find: accountFind } as never,
      { query } as never,
      {} as never,
    );
    return { service, query, qb, accountFind };
  }

  it("binds the user id as $1 and never queries for an empty or inverted range", async () => {
    const { service, query } = build();
    expect(await service.getAccountSnapshots("u1", { from: "2025-06", to: "2025-01" })).toEqual([]);
    expect(await service.getAccountSnapshots("u1", { from: "bad", to: "2025-01" })).toEqual([]);
    expect(
      await service.getAccountSnapshots("u1", { from: "2025-01", to: "2025-02", accountIds: [] }),
    ).toEqual([]);
    expect(query).not.toHaveBeenCalled();
    await service.getAccountSnapshots("u1", { from: "2025-01", to: "2025-02", accountIds: ["x"] });
    expect(query).not.toHaveBeenCalled(); // no valid uuid left, so no query
    const id = "0A1B2C3D-0000-4000-8000-000000000001";
    await service.getAccountSnapshots("u1", {
      from: "2025-01",
      to: "2025-02",
      accountIds: ["x", id],
    });
    const [sql, params] = query.mock.calls[0] as unknown as [string, unknown[]];
    expect(params).toEqual(["u1", 2025 * 12, 2025 * 12 + 1, [id.toLowerCase()]]);
    expect(sql).toContain("= ANY($4::uuid[])");
    expect(sql).toContain('a."user_id" = $1');
    expect(sql).toContain('d."user_id" = $1');
  });

  it("maps coverage rows, including the text form of a Postgres array", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        {
          accountId: "a1",
          first: 24300,
          last: 24305,
          recorded: "3",
          sources: "{manual,connected}",
        },
      ])
      .mockResolvedValueOnce([{ accountId: "a1", from: 24301, to: 24303 }]);
    const { service } = build(query);
    expect(await service.getDataCoverage("u1")).toEqual([
      {
        accountId: "a1",
        firstMonth: "2025-01",
        lastMonth: "2025-06",
        recordedMonths: 3,
        gaps: [{ from: "2025-02", to: "2025-04" }],
        sources: ["connected", "manual"],
      },
    ]);
  });

  it("selects tax-record columns explicitly, with no receipt or notes column", async () => {
    const { service, qb } = build();
    expect(await service.getTaxRecords("u1", { fromDate: "x", toDate: "2026-03-31" })).toEqual([]);
    await service.getTaxRecords("u1", { fromDate: "2025-04-01", toDate: "2026-03-31" });
    const cols = (qb.select.mock.calls[0] as unknown as [string[]])[0];
    expect(cols).toContain("t.id");
    expect(cols.filter((c) => /receipt|notes/i.test(c))).toEqual([]);
    expect(qb.where).toHaveBeenCalledWith("t.user_id = :userId", { userId: "u1" });
  });

  it("returns accounts without connection ids and with numbers", async () => {
    const { service, accountFind } = build();
    const [a] = await service.getAccounts("u1");
    expect(a).toMatchObject({
      balance: 10.5,
      monthlyContribution: 3,
      interestRate: null,
      isCurrent: true,
    });
    expect(a).not.toHaveProperty("connectionId");
    expect((accountFind.mock.calls[0] as unknown as [{ where: unknown }])[0].where).toEqual({
      userId: "u1",
    });
  });
});

describe("AgentDataService.getAccounts carries joint ownership (E34)", () => {
  it("selects and returns ownership and sharePercent, so MCP reads count the user's share", async () => {
    const accountFind = vi.fn(async () => [
      {
        id: "a1",
        name: "Joint saver",
        type: "Saving",
        balance: "10000",
        interestRate: null,
        monthlyContribution: null,
        termMonths: null,
        fixedRateEndDate: null,
        currency: "GBP",
        isCurrent: true,
        ownership: "joint",
        sharePercent: 40,
      },
    ]);
    const service = new AgentDataService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { getProfile: async () => ({}) } as never,
      { find: accountFind } as never,
      {} as never,
      {} as never,
    );
    const [a] = await service.getAccounts("u1");
    expect(a).toMatchObject({ ownership: "joint", sharePercent: 40 });
    const select = (
      accountFind.mock.calls[0] as unknown as [{ select: Record<string, boolean> }]
    )[0].select;
    expect(select).toMatchObject({ ownership: true, sharePercent: true });
  });
});
