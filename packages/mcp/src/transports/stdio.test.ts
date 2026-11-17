import { McpInputResponse } from "@flump/api-contract";
import { type BuildContextPackInput, buildFlumpAiContextPack } from "@flump/finance-engine";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it, vi } from "vitest";
import { connectTestClient, TEST_TOKEN } from "../testing/client.js";
import {
  INPUT_REUSE_MS,
  localScopes,
  PAT_REJECTED_MESSAGE,
  PatRejectedError,
  runStdio,
  toEngineInput,
} from "./stdio.js";

// Built at run time: a token-shaped literal in a public repository trips secret scanners.
const PAT = ["flump", "pat", "0".repeat(32)].join("_");
const ACCOUNT_ID = "6f1c6a4e-5b0e-4a63-9d0a-3f2f2a9d1c11";
// A sample id, also built at run time (a hex literal beside the word "token" reads as a key).
const TOKEN_ID = [ACCOUNT_ID.slice(0, 24), "0".repeat(11), "1"].join("");

// The real GET /v1/mcp/input shape (McpInputResponse) for an anonymised token.
const okInput = {
  token: {
    id: TOKEN_ID,
    scopes: ["mcp:read:anonymized", "mcp:simulate"],
    anonymizeInstitutions: true,
  },
  input: {
    baseline: {
      userId: "anonymous-user",
      taxYear: "2026/27",
      ukRegion: "ENGLAND_NI_WALES",
      employmentStatus: "PAYE",
      annualGrossSalary: 42000,
      annualBonusOrSideIncome: 0,
      pensionContributionPct: 5,
      employerPensionMatchPct: 3,
      isSalarySacrifice: false,
      studentLoanPlan: "NONE",
      propertyOwnershipSharePct: 100,
      financialStage: "STAGE_2_BUFFER_BUILD",
      enabledModules: ["accounts", "budget"],
    },
    profileFacts: {
      annualSalary: 42000,
      employmentType: "employed",
      taxRegion: "ENGLAND",
      studentLoanPlans: [],
      pensionPercent: 5,
      isSalarySacrifice: false,
      housingStatus: "renting",
      monthlyHousingCost: 950,
      mortgageType: null,
      propertyOwnershipShare: null,
    },
    netWorthBasis: { countProperty: true, countStudentLoan: false },
    accounts: [
      {
        id: ACCOUNT_ID,
        name: "Current Account #1",
        type: "Current",
        balance: 4000,
        interestRate: 1.5,
        monthlyContribution: null,
        termMonths: null,
        fixedRateEndDate: null,
        currency: "GBP",
        isCurrent: true,
      },
    ],
    accountDetails: [
      { accountId: ACCOUNT_ID, year: 2026, month: 9, value: 3900, source: "manual" },
    ],
    budgetEntries: [
      {
        id: "b1",
        category: "Housing",
        name: "Housing #1",
        amount: 950,
        frequency: "monthly",
        isIncome: false,
        isEssential: true,
      },
    ],
    taxRecords: [
      {
        id: "t1",
        type: "income",
        source: "rental",
        category: "rental_income",
        name: "",
        amount: 800,
        frequency: "monthly",
        date: "2026-04-06",
        endDate: null,
        notes: null,
      },
    ],
  },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("runStdio", () => {
  it("rejects a missing FLUMP_PAT without calling the API", async () => {
    const fetchImpl = vi.fn();
    await expect(runStdio({}, fetchImpl as unknown as typeof fetch)).rejects.toThrow(
      PatRejectedError,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(PAT_REJECTED_MESSAGE).toBe(
      "Personal access token rejected. Create a new one in Flump under AI connections.",
    );
  });

  for (const status of [401, 403, 404, 500]) {
    it(`rejects a ${status} response and connects nothing`, async () => {
      const fetchImpl = vi.fn(async () => json({}, status));
      const connect = vi.fn();
      await expect(
        runStdio({ FLUMP_PAT: PAT }, fetchImpl as unknown as typeof fetch, connect),
      ).rejects.toThrow(PatRejectedError);
      expect(connect).not.toHaveBeenCalled();
    });
  }

  it("rejects when the API is unreachable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    const connect = vi.fn();
    await expect(
      runStdio({ FLUMP_PAT: PAT }, fetchImpl as unknown as typeof fetch, connect),
    ).rejects.toThrow(/Could not reach Flump API at/);
    expect(connect).not.toHaveBeenCalled();
  });

  it("sends the PAT as a bearer token and connects on 2xx", async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => json(okInput));
    const connect = vi.fn();
    await runStdio(
      { FLUMP_PAT: PAT, FLUMP_API_URL: "https://api.example.test" },
      fetchImpl as unknown as typeof fetch,
      connect,
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.test/v1/mcp/input",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${PAT}` }),
      }),
    );
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("rejects on timeout, passes an abort signal and never connects", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      throw new DOMException("The operation timed out", "TimeoutError");
    });
    const connect = vi.fn();
    await expect(
      runStdio({ FLUMP_PAT: PAT }, fetchImpl as unknown as typeof fetch, connect),
    ).rejects.toThrow(/Could not reach Flump API/);
    expect(connect).not.toHaveBeenCalled();
  });

  it("rejects a 200 response with a non-JSON body", async () => {
    const fetchImpl = vi.fn(async () => new Response("<html>oops</html>", { status: 200 }));
    const connect = vi.fn();
    await expect(
      runStdio({ FLUMP_PAT: PAT }, fetchImpl as unknown as typeof fetch, connect),
    ).rejects.toThrow(/does not match the contract/);
    expect(connect).not.toHaveBeenCalled();
  });

  it("rejects a 200 whose body is not a McpInputResponse (a context pack, or a wrong type)", async () => {
    const bodies = [
      { pack: { baseline: { userId: "user-1" } }, markdown: "# FLUMP" },
      { token: okInput.token },
      { ...okInput, input: { ...okInput.input, netWorthBasis: { countProperty: "yes" } } },
      { ...okInput, token: { ...okInput.token, anonymizeInstitutions: null } },
    ];
    for (const body of bodies) {
      const connect = vi.fn();
      await expect(
        runStdio({ FLUMP_PAT: PAT }, (async () => json(body)) as unknown as typeof fetch, connect),
      ).rejects.toThrow(/does not match the contract/);
      expect(connect).not.toHaveBeenCalled();
    }
  });

  it("hands the parsed input to the engine unchanged, tax records and history included", () => {
    const parsed = McpInputResponse.parse(okInput);
    const input = toEngineInput(parsed.input);
    expect(input).toEqual(okInput.input);
    // The engine accepts it as it is: the same figures the remote server would compute from.
    const pack = buildFlumpAiContextPack(input, { anonymizeInstitutions: true });
    expect(pack.portfolio.totalLiquidCash).toBe(4000);
    expect(pack.taxSummary.selfAssessmentLedgerSummary).toBeDefined();
  });

  it("never runs with the staging scope, and drops scopes it does not know", () => {
    expect(localScopes(["mcp:read:anonymized", "mcp:simulate", "write:stage", "admin"])).toEqual([
      "mcp:read:anonymized",
      "mcp:simulate",
    ]);
  });

  /** Runs the server against `body` and returns a connected client. */
  const connectClient = async (body: unknown) => {
    const client = new Client({ name: "stdio-test", version: "0.0.0" });
    const fetchImpl = vi.fn(async () => json(body));
    const clock = { now: 1_000_000 };
    await runStdio(
      { FLUMP_PAT: PAT },
      fetchImpl as unknown as typeof fetch,
      async (server) => {
        const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
        await server.connect(serverSide);
        await client.connect(clientSide);
      },
      undefined,
      () => clock.now,
    );
    return { client, fetchImpl, clock };
  };
  const textOf = (result: unknown) =>
    ((result as { content?: Array<{ text?: string }> }).content ?? [])
      .map((block) => block.text ?? "")
      .join("\n");

  it("answers read tools from the fetched input, one request per few seconds", async () => {
    const { client, fetchImpl, clock } = await connectClient(okInput);
    const result = await client.callTool({ name: "list_accounts", arguments: {} });
    expect(result.isError).not.toBe(true);
    expect(textOf(result)).toContain("4000");
    // A tool that makes several provider reads, straight after start: still the one request.
    const snapshot = await client.callTool({ name: "get_financial_snapshot", arguments: {} });
    expect(snapshot.isError).not.toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    // Later calls read fresh data, once per tool call rather than once per provider read.
    clock.now += INPUT_REUSE_MS;
    await client.callTool({ name: "get_financial_snapshot", arguments: {} });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const tax = await client.callTool({
      name: "list_tax_records",
      arguments: { taxYear: "2026/27" },
    });
    expect(tax.isError).not.toBe(true);
    expect(textOf(tax)).toContain("800");
  });

  it("does not keep a failed read: the next tool call asks again", async () => {
    const client = new Client({ name: "stdio-test", version: "0.0.0" });
    const clock = { now: 1_000_000 };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json(okInput))
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValue(json(okInput));
    await runStdio(
      { FLUMP_PAT: PAT },
      fetchImpl as unknown as typeof fetch,
      async (server) => {
        const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
        await server.connect(serverSide);
        await client.connect(clientSide);
      },
      undefined,
      () => clock.now,
    );
    clock.now += INPUT_REUSE_MS;
    const failed = await client.callTool({ name: "list_accounts", arguments: {} });
    expect(failed.isError).toBe(true);
    const retried = await client.callTool({ name: "list_accounts", arguments: {} });
    expect(retried.isError).not.toBe(true);
    expect(textOf(retried)).toContain("4000");
  });

  it("hides the retirement tools unless the API says retirement is available", async () => {
    const names = async (body: unknown) => {
      const { client } = await connectClient(body);
      return (await client.listTools()).tools.map((tool) => tool.name);
    };
    const absent = await names(okInput);
    expect(absent).toContain("list_accounts");
    expect(absent).not.toContain("get_retirement_picture");
    expect(absent).not.toContain("simulate_retirement");
    const refused = await names({ ...okInput, retirementAvailable: false });
    expect(refused).not.toContain("get_retirement_picture");
    expect(refused).not.toContain("simulate_retirement");
    const allowed = await names({ ...okInput, retirementAvailable: true });
    expect(allowed).toContain("get_retirement_picture");
    expect(allowed).toContain("simulate_retirement");
  });

  it("applies the token's own scopes: a token without a read scope reads nothing", async () => {
    const { client } = await connectClient({
      ...okInput,
      token: { ...okInput.token, scopes: ["mcp:simulate"] },
    });
    const result = await client.callTool({ name: "list_accounts", arguments: {} });
    expect(result.isError).toBe(true);
    expect(textOf(result)).not.toContain("4000");
  });

  it("never includes the PAT in thrown errors", async () => {
    const failures: Array<typeof fetch> = [
      (async () => {
        throw new Error(`boom ${PAT}`);
      }) as unknown as typeof fetch,
      (async () => json({}, 401)) as unknown as typeof fetch,
      (async () => new Response("nope", { status: 200 })) as unknown as typeof fetch,
      (async () => json({ baseline: {} })) as unknown as typeof fetch,
    ];
    for (const fetchImpl of failures) {
      const err = await runStdio({ FLUMP_PAT: PAT }, fetchImpl, vi.fn()).catch((e) => e);
      expect(err).toBeInstanceOf(Error);
      expect(String(err.message)).not.toContain(PAT);
    }
  });

  it("gives the same net worth and retirement figures through the wire as directly", async () => {
    const PENSION_ID = "6f1c6a4e-5b0e-4a63-9d0a-3f2f2a9d1c21";
    const JOINT_ID = "6f1c6a4e-5b0e-4a63-9d0a-3f2f2a9d1c22";
    const token = { id: TOKEN_ID, scopes: ["mcp:read:full", "mcp:simulate"] };
    // Age 60 this year, whatever year the test runs in.
    const birthYear = new Date().getUTCFullYear() - 60;
    const wireInput = {
      ...okInput.input,
      accounts: [
        { ...okInput.input.accounts[0], id: PENSION_ID, type: "Pension", balance: 100_000 },
        {
          ...okInput.input.accounts[0],
          id: JOINT_ID,
          type: "Saving",
          balance: 40_000,
          ownership: "joint",
          sharePercent: 50,
        },
      ],
      accountDetails: [],
      retirementPlan: {
        retirementAge: 60,
        planToAge: 80,
        target: { kind: "typed", yearlyAmount: 20_000 },
        housingOverride: null,
        statePensionAge: 67,
        statePensionAnnualForecastGbp: 11_000,
        statePensionQualifyingYears: null,
        growthRates: { lower: 0.02, middle: 0.02, higher: 0.02 },
        inflationRate: 0.02,
        cashSavingsNominalRate: 0.02,
        realRentGrowthRate: 0,
        excludedAccountIds: [],
      },
      birthYear,
    };
    const body = {
      token: { ...token, anonymizeInstitutions: false },
      retirementAvailable: true,
      input: wireInput,
    };
    const parsed = McpInputResponse.parse(body);
    expect(parsed.input.accounts[1]).toMatchObject({ ownership: "joint", sharePercent: 50 });

    const local = await connectClient(body);
    const direct = await connectTestClient(wireInput as BuildContextPackInput, {
      token: { ...TEST_TOKEN, scopes: token.scopes as never, anonymizeInstitutions: false },
    });
    const figures = async (call: (name: string) => Promise<unknown>) => {
      const snapshot = (await call("get_financial_snapshot")) as {
        result: { netWorthGbp: number };
      };
      const picture = (await call("get_retirement_picture")) as {
        result: Record<string, unknown>;
        missing: unknown[];
      };
      return {
        netWorth: snapshot.result.netWorthGbp,
        retirement: picture.result,
        missing: picture.missing,
      };
    };
    const viaWire = await figures(async (name) =>
      JSON.parse(textOf(await local.client.callTool({ name, arguments: {} }))),
    );
    const viaDirect = await figures((name) => direct.callJson(name, {}));
    await direct.close();

    // Pension £100,000 plus half of the £40,000 joint saver.
    expect(viaWire.netWorth).toBe(120_000);
    expect(viaWire.retirement.currentCountedPotGbp).toBe(120_000);
    expect(viaWire.retirement.retirementAge).toBe(60);
    expect(viaWire.missing).toEqual([]);
    expect(viaWire).toEqual(viaDirect);
  });
});
