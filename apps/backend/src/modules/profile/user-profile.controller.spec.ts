import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { InMemoryIdentityAdapter } from "../../identity/identity.adapter";
import { RATE_LIMIT_CLASS } from "../../security/rate-limit.decorator";
import { at } from "../../testing/must";
import { UserProfileController } from "./user-profile.controller";
import { UserProfileService } from "./user-profile.service";

/** A WorkOS auth_time from a moment ago: the recent-login check passes. */
const freshAuthTime = () => Math.floor(Date.now() / 1000) - 30;

describe("UserProfileController", () => {
  let controller: UserProfileController;
  let mockUserProfileRepo: { findOne: Mock; save: Mock; create: Mock; query: Mock };
  let mockAccountRepo: { find: Mock; delete: Mock };
  let mockTransactionRepo: { delete: Mock };
  let mockAccountDetailRepo: { delete: Mock };
  let mockBankConnectionRepo: { delete: Mock };
  let mockBudgetEntryRepo: { delete: Mock };
  let mockTaxRecordRepo: { delete: Mock };

  beforeEach(() => {
    mockUserProfileRepo = {
      findOne: vi.fn(),
      save: vi.fn((entity) => Promise.resolve({ id: "profile-1", ...entity })),
      create: vi.fn((entity) => ({ ...entity })),
      // Raw queries clear the profile's migration before-images on reset (every table exists here).
      query: vi.fn().mockResolvedValue([{ t: "exists" }]),
    };
    mockAccountRepo = {
      find: vi.fn().mockResolvedValue([{ id: "acc-1", userId: "user-123" }]),
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    mockTransactionRepo = {
      delete: vi.fn().mockResolvedValue({ affected: 5 }),
    };
    mockAccountDetailRepo = {
      delete: vi.fn().mockResolvedValue({ affected: 2 }),
    };
    mockBankConnectionRepo = {
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    mockBudgetEntryRepo = {
      delete: vi.fn().mockResolvedValue({ affected: 3 }),
    };
    mockTaxRecordRepo = {
      delete: vi.fn().mockResolvedValue({ affected: 4 }),
    };

    // Test wiring (BE-13): the controller takes the service; the service takes the repositories.
    // The reset runs in a transaction whose manager hands out these doubles; any other registry
    // table removes nothing.
    const byEntity: Record<string, unknown> = {
      UserProfile: mockUserProfileRepo,
      Account: mockAccountRepo,
      Transaction: mockTransactionRepo,
      AccountDetail: mockAccountDetailRepo,
      BankConnection: mockBankConnectionRepo,
      BudgetEntry: mockBudgetEntryRepo,
      TaxRecord: mockTaxRecordRepo,
      AuditEvent: { insert: vi.fn().mockResolvedValue(undefined) },
      Consent: { update: vi.fn().mockResolvedValue({ affected: 0 }) },
    };
    const dataSource = {
      transaction: vi.fn(async (cb: (manager: unknown) => unknown) =>
        cb({
          getRepository: (entity: { name: string }) =>
            byEntity[entity.name] ?? { delete: vi.fn().mockResolvedValue({ affected: 0 }) },
        }),
      ),
    };
    controller = new UserProfileController(
      new UserProfileService(
        ...([
          mockUserProfileRepo,
          mockAccountRepo,
          mockAccountDetailRepo,
          mockBankConnectionRepo,
          new InMemoryIdentityAdapter(),
          dataSource,
          { revokeAll: vi.fn().mockResolvedValue(undefined) },
          { isErased: vi.fn().mockResolvedValue(false) },
        ] as unknown as ConstructorParameters<typeof UserProfileService>),
      ),
      {} as never,
      {} as never,
      null,
    );
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getUserProfile", () => {
    it("returns formatted profile and user email", async () => {
      mockUserProfileRepo.findOne.mockResolvedValueOnce({
        userId: "user-123",
        displayName: "Jane Doe",
        firstName: "Jane",
        lastName: "Doe",
        annualSalary: "50000.00",
        monthlyTakeHome: "3200.00",
        hasResetFinancialData: false,
      });

      const result = await controller.getUserProfile({
        user: { id: "user-123", email: "jane@example.com" },
      });

      expect(result.userId).toBe("user-123");
      expect(result).not.toHaveProperty("displayName");
      expect(result.firstName).toBe("Jane");
      expect(result.lastName).toBe("Doe");
      expect(result.email).toBe("jane@example.com");
      expect(result.annualSalary).toBe(50000);
      expect(result.hasResetFinancialData).toBe(false);
    });
  });

  describe("updateUserProfile", () => {
    it("updates firstName and lastName", async () => {
      mockUserProfileRepo.findOne.mockResolvedValueOnce({
        userId: "user-123",
        displayName: "Old Name",
        firstName: "Old",
        lastName: "User",
      });

      const result = await controller.updateUserProfile(
        { user: { id: "user-123", email: "jane@example.com" } },
        {
          firstName: "Jane",
          lastName: "Smith",
        },
      );

      expect(mockUserProfileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "Jane",
          lastName: "Smith",
        }),
      );
      expect(result.firstName).toBe("Jane");
      expect(result.lastName).toBe("Smith");
      expect(result.email).toBe("jane@example.com");
    });
  });

  describe("resetFinancialData", () => {
    it("deletes all financial entities and resets profile financial settings", async () => {
      mockUserProfileRepo.findOne.mockResolvedValueOnce({
        userId: "user-123",
        annualSalary: 80000,
        monthlyTakeHome: 4500,
        hasMortgage: true,
        hasResetFinancialData: false,
      });

      const res = await controller.resetFinancialData(
        { user: { id: "user-123", email: "jane@example.com", authTime: freshAuthTime() } },
        { confirmation: "RESET" },
      );

      expect(mockAccountRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "user-123" } }),
      );
      expect(mockAccountDetailRepo.delete).toHaveBeenCalled();
      expect(mockTransactionRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });
      expect(mockAccountRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });
      expect(mockBankConnectionRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });
      expect(mockBudgetEntryRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });
      expect(mockTaxRecordRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });

      expect(mockUserProfileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          annualSalary: null,
          monthlyTakeHome: null,
          hasMortgage: false,
          // Not answered, never 0% (finding AI-12, owner decision 3).
          pensionPercent: null,
          pensionEmployerPercent: null,
          isSalarySacrifice: null,
          isSalarySacrificeEmployerNi: false,
          customBudgetCategories: [],
          hasResetFinancialData: true,
          onboardingCompleted: false,
        }),
      );
      expect(res.success).toBe(true);
      expect(res.profile.hasResetFinancialData).toBe(true);
      expect(res.profile.onboardingCompleted).toBe(false);
      expect(res.profile.pensionPercent).toBeNull();
      expect(res.profile.pensionEmployerPercent).toBeNull();
      expect(res.profile.isSalarySacrifice).toBeNull();
      expect(res.profile.customBudgetCategories).toEqual([]);
    });
  });

  describe("resetFinancialData confirmation and audit (security review)", () => {
    const req = { user: { id: "user-123", email: "jane@example.com", authTime: freshAuthTime() } };

    it.each([
      ["no body", undefined],
      ["an empty body", {}],
      ["the wrong phrase", { confirmation: "reset" }],
      ["a non-string phrase", { confirmation: true }],
    ])("rejects %s with a 400 and deletes nothing", async (_label, body) => {
      await expect(controller.resetFinancialData(req, body as never)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(mockAccountRepo.delete).not.toHaveBeenCalled();
      expect(mockTransactionRepo.delete).not.toHaveBeenCalled();
      expect(mockUserProfileRepo.save).not.toHaveBeenCalled();
    });

    it("logs one financial_data_reset event with row counts only, no user id", async () => {
      mockUserProfileRepo.findOne.mockResolvedValueOnce({
        userId: "user-123",
        annualSalary: 80000,
        displayName: "Jane Smith",
      });
      const log = vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);

      // Raw input as with CONTRACT_MODE=off: the handler still checks only the phrase.
      await controller.resetFinancialData(req, { confirmation: "RESET", extra: 1 } as never);

      const events = log.mock.calls
        .map(([message]) => JSON.stringify(message))
        .filter((m) => m.includes("financial_data_reset"));
      expect(events).toHaveLength(1);
      const event = JSON.parse(at(events, 0));
      // S6: no user id in the log line (the audit row holds it); row counts only.
      expect(Object.keys(event).sort()).toEqual(["event", "removed"]);
      expect(at(events, 0)).not.toContain("user-123");
      expect(event.removed).toEqual({
        accountDetails: 4,
        accountGoals: 0,
        snapshotCheckins: 0,
        importBatches: 0,
        transactions: 5,
        accounts: 1,
        bankConnections: 1,
        bankOAuthStates: 0,
        budgetEntries: 3,
        workLogEntries: 0,
        invoices: 0,
        invoicingSettings: 0,
        taxRecords: 4,
        mcpTokens: 0,
        idempotencyKeys: 0,
        retirementPlan: 0,
      });
      expect(events[0]).not.toContain("jane@example.com");
      expect(events[0]).not.toContain("80000");
      expect(events[0]).not.toContain("Jane");
      log.mockRestore();
    });
  });

  describe("checklist, password reset, and default profile creation", () => {
    it("creates default profile when none exists on getUserProfile and updateUserProfile", async () => {
      mockUserProfileRepo.findOne.mockResolvedValueOnce(null);
      const createdProfile = await controller.getUserProfile({
        user: { id: "u-new", email: "new@example.com" },
      });
      expect(createdProfile.userId).toBe("u-new");
      expect(createdProfile.currency).toBe("GBP");

      mockUserProfileRepo.findOne.mockResolvedValueOnce(null);
      const updated = await controller.updateUserProfile(
        { user: { id: "u-new", email: "new@example.com" } },
        {
          currency: "GBP",
          country: "GB",
          employmentType: "employed",
          annualSalary: 60000,
          monthlyTakeHome: 3500,
          secondIncomeMonthly: 500,
          hasRentalIncome: true,
          rentalIncomeMonthly: 1000,
          hasMortgage: true,
          mortgageType: "repayment",
          propertyOwnershipShare: 50,
          pensionPercent: 6,
          pensionEmployerPercent: 4,
          isSalarySacrifice: true,
          isSalarySacrificeEmployerNi: true,
          enabledPages: ["accounts"],
          dashboardWidgets: ["accounts"],
          dashboardWidgetOrder: ["accounts"],
          customBudgetCategories: ["travel"],
          onboardingCompleted: true,
        },
      );
      expect(updated.annualSalary).toBe(60000);
      expect(updated.onboardingCompleted).toBe(true);
    });

    it("updates checklist steps (adding and removing)", async () => {
      mockUserProfileRepo.findOne.mockResolvedValueOnce(null);
      const added = await controller.updateChecklist(
        { user: { id: "u1" } },
        { step: "connect_bank", completed: true },
      );
      expect(added.setupChecklistCompletedSteps).toContain("connect_bank");

      mockUserProfileRepo.findOne.mockResolvedValueOnce({
        userId: "u1",
        setupChecklistCompletedSteps: ["connect_bank", "set_budget"],
      });
      const removed = await controller.updateChecklist(
        { user: { id: "u1" } },
        { step: "connect_bank", completed: false },
      );
      expect(removed.setupChecklistCompletedSteps).toEqual(["set_budget"]);
    });

    it("stores the checklist as dismissed on the profile and leaves the steps alone (decision 13)", async () => {
      mockUserProfileRepo.findOne.mockResolvedValueOnce({
        userId: "u1",
        setupChecklistCompletedSteps: ["budget"],
        setupChecklistDismissed: false,
      });
      const dismissed = await controller.updateChecklist(
        { user: { id: "u1" } },
        { dismissed: true },
      );
      expect(dismissed.setupChecklistDismissed).toBe(true);
      expect(dismissed.setupChecklistCompletedSteps).toEqual(["budget"]);
    });

    it("reads a profile saved before the flag existed as not dismissed", async () => {
      mockUserProfileRepo.findOne.mockResolvedValueOnce({ userId: "u1" });
      const added = await controller.updateChecklist(
        { user: { id: "u1" } },
        { step: "budget", completed: true },
      );
      expect(added.setupChecklistDismissed).toBe(false);
    });

    it("rejects sendPasswordReset (503) when the identity provider has no email for the user", async () => {
      await expect(controller.sendPasswordReset({ user: { id: "u1" } })).rejects.toMatchObject({
        status: 503,
      });
    });
  });
});

describe("UserProfileController account deletion and export (BE-04)", () => {
  const fresh = { id: "user-123", authTime: Math.floor(Date.now() / 1000) - 30 };
  const stale = { id: "user-123", authTime: Math.floor(Date.now() / 1000) - 3600 };
  const make = (deletion?: object, exporter?: object) =>
    new UserProfileController({} as never, deletion as never, exporter as never, null);

  it.each([
    ["no body", undefined],
    ["the wrong phrase", { confirmation: "delete" }],
    ["the reset phrase", { confirmation: "RESET" }],
  ])("deleteUser rejects %s with a 400 and deletes nothing", async (_label, body) => {
    const deleteAccount = vi.fn();
    await expect(
      make({ deleteAccount }).deleteUser({ user: fresh }, body as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it("deleteUser needs a recent sign-in (403 recent_login_required), checked after the phrase", async () => {
    const deleteAccount = vi.fn();
    await expect(
      make({ deleteAccount }).deleteUser({ user: stale }, { confirmation: "DELETE" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it("deleteUser passes the caller's own id and returns the service outcome", async () => {
    const deleteAccount = vi.fn().mockResolvedValue({ status: "identity_pending" });
    await expect(
      make({ deleteAccount }).deleteUser({ user: fresh }, {
        confirmation: "DELETE",
        userId: "someone-else",
      } as never),
    ).resolves.toEqual({ status: "identity_pending" });
    expect(deleteAccount).toHaveBeenCalledWith("user-123");
  });

  it("resetFinancialData needs a recent sign-in too (L1)", async () => {
    await expect(
      make().resetFinancialData({ user: stale }, { confirmation: "RESET" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  const fakeRes = () => {
    const chunks: string[] = [];
    const headers: Record<string, string> = {};
    const res = {
      statusCode: 0,
      headersSent: false,
      destroyed: false,
      status(code: number) {
        res.statusCode = code;
        return res;
      },
      setHeader(k: string, v: string) {
        headers[k.toLowerCase()] = v;
      },
      removeHeader(k: string) {
        delete headers[k.toLowerCase()];
      },
      write(chunk: string) {
        res.headersSent = true;
        chunks.push(chunk);
        return true;
      },
      end: vi.fn(),
      destroy: vi.fn(),
      json: vi.fn(),
      once: vi.fn(),
      off: vi.fn(),
    };
    return { res, chunks, headers };
  };

  it("exportData streams the document as a no-store attachment", async () => {
    const writeExport = vi.fn(async (_id: string, write: (c: string) => Promise<void>) => {
      await write('{"schemaVersion":1');
      await write("}");
    });
    const { res, chunks, headers } = fakeRes();
    await make(undefined, { writeExport }).exportData({ user: fresh }, res as never);
    expect(writeExport).toHaveBeenCalledWith("user-123", expect.any(Function), expect.any(Date));
    expect(res.statusCode).toBe(200);
    expect(headers["content-type"]).toBe("application/json; charset=utf-8");
    expect(headers["content-disposition"]).toMatch(
      /^attachment; filename="flump-export-\d{4}-\d{2}-\d{2}\.json"$/,
    );
    expect(headers["cache-control"]).toBe("no-store");
    expect(chunks.join("")).toBe('{"schemaVersion":1}');
    expect(res.end).toHaveBeenCalled();
  });

  it("exportData answers 503 if it fails before any byte, and cuts the stream if after", async () => {
    vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const early = fakeRes();
    // Thrown, so the exception filter writes the 503 in the shared error envelope (BE-09).
    await expect(
      make(undefined, {
        writeExport: vi.fn().mockRejectedValue(new Error("db down")),
      }).exportData({ user: fresh }, early.res as never),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(early.headers["content-disposition"]).toBeUndefined();

    const late = fakeRes();
    await make(undefined, {
      writeExport: vi.fn(async (_id: string, write: (c: string) => Promise<void>) => {
        await write("{");
        throw new Error("db down");
      }),
    }).exportData({ user: fresh }, late.res as never);
    expect(late.res.destroy).toHaveBeenCalled();
    expect(late.res.end).not.toHaveBeenCalled();
  });

  it("exportCsv streams full CSV and per-section CSV as uncached attachments", async () => {
    const writeCsvExport = vi.fn(
      async (_id: string, write: (c: string) => Promise<void>, opts?: { section?: string }) => {
        await write(opts?.section ? "id,name\r\n" : "section,profile\r\n");
      },
    );
    const full = fakeRes();
    await make(undefined, { writeCsvExport }).exportCsv({ user: fresh }, full.res as never);
    expect(writeCsvExport).toHaveBeenCalledWith("user-123", expect.any(Function), {
      section: undefined,
    });
    expect(full.res.statusCode).toBe(200);
    expect(full.headers["content-type"]).toBe("text/csv; charset=utf-8");
    expect(full.headers["content-disposition"]).toMatch(
      /^attachment; filename="flump-export-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    expect(full.headers["cache-control"]).toBe("no-store");
    expect(full.headers["x-content-type-options"]).toBe("nosniff");
    expect(full.chunks.join("")).toBe("section,profile\r\n");
    expect(full.res.end).toHaveBeenCalled();

    const scoped = fakeRes();
    await make(undefined, { writeCsvExport }).exportCsv(
      { user: fresh },
      scoped.res as never,
      "accounts",
    );
    expect(writeCsvExport).toHaveBeenCalledWith("user-123", expect.any(Function), {
      section: "accounts",
    });
    expect(scoped.headers["content-disposition"]).toMatch(
      /^attachment; filename="flump-export-accounts-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
  });

  it("exportCsv rejects an unknown section with 400 before calling the exporter", async () => {
    const writeCsvExport = vi.fn();
    const { res } = fakeRes();
    await expect(
      make(undefined, { writeCsvExport }).exportCsv({ user: fresh }, res as never, "bogus"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(writeCsvExport).not.toHaveBeenCalled();
  });
});

describe("UserProfileController terms acceptance (BE-15, M-PRIV3)", () => {
  const user = { id: "user-123" };
  const make = (termsVersion: string | null, acceptTerms = vi.fn()) =>
    new UserProfileController({ acceptTerms } as never, {} as never, {} as never, termsVersion);

  it("records the current version and reports whether this call wrote the row", async () => {
    const acceptTerms = vi.fn().mockResolvedValue({ recorded: true });
    const controller = make("2026-11-01", acceptTerms);
    await expect(
      controller.acceptTerms({ user } as never, { version: "2026-11-01" }),
    ).resolves.toEqual({ version: "2026-11-01", recorded: true });
    expect(acceptTerms).toHaveBeenCalledWith("user-123", "2026-11-01");
  });

  it("answers 503 terms_not_configured while TERMS_VERSION is unset, writing nothing", async () => {
    const acceptTerms = vi.fn();
    const thrown = await make(null, acceptTerms)
      .acceptTerms({ user } as never, { version: "2026-11-01" })
      .catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(ServiceUnavailableException);
    expect((thrown as ServiceUnavailableException).getResponse()).toMatchObject({
      code: "terms_not_configured",
    });
    expect(acceptTerms).not.toHaveBeenCalled();
  });

  it("answers 409 terms_version_mismatch for any other version, writing nothing", async () => {
    const acceptTerms = vi.fn();
    const thrown = await make("2026-11-01", acceptTerms)
      .acceptTerms({ user } as never, { version: "2026-01-01" })
      .catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(ConflictException);
    expect((thrown as ConflictException).getResponse()).toMatchObject({
      code: "terms_version_mismatch",
    });
    expect(acceptTerms).not.toHaveBeenCalled();
  });

  it.each([
    ["no body", undefined],
    ["an empty version", { version: "" }],
    ["free text", { version: "I agree <b>" }],
    ["an extra key", { version: "2026-11-01", userId: "user-other" }],
  ])("refuses %s with a 400 even with contract enforcement off", async (_label, body) => {
    const acceptTerms = vi.fn();
    await expect(
      make("2026-11-01", acceptTerms).acceptTerms({ user } as never, body as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(acceptTerms).not.toHaveBeenCalled();
  });

  it("is a 200 POST with the default write rate limit, like the other profile writes", () => {
    const handler = UserProfileController.prototype.acceptTerms;
    expect(Reflect.getMetadata("__httpCode__", handler)).toBe(200);
    expect(Reflect.getMetadata("path", handler)).toBe("user-profile/terms-acceptance");
    // No class override: the HTTP-method default (write) tier applies.
    expect(Reflect.getMetadata(RATE_LIMIT_CLASS, handler)).toBeUndefined();
  });
});
