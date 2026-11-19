import { Logger, ServiceUnavailableException } from "@nestjs/common";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { InMemoryIdentityAdapter } from "../../identity/identity.adapter";
import { at } from "../../testing/must";
import { UserProfileService } from "./user-profile.service";

type DeleteRepo = { delete: Mock };

describe("UserProfileService (Deep Module)", () => {
  let service: UserProfileService;
  let mockUserProfileRepo: { findOne: Mock; save: Mock; create: Mock; query: Mock };
  let mockAccountRepo: { find: Mock; delete: Mock };
  let mockTransactionRepo: DeleteRepo;
  let mockAccountDetailRepo: DeleteRepo;
  let mockBankConnectionRepo: DeleteRepo & { find?: Mock };
  let mockBudgetEntryRepo: DeleteRepo;
  let mockTaxRecordRepo: DeleteRepo;
  let mockCheckinRepo: DeleteRepo;
  let mockImportRepo: DeleteRepo;
  let mockMcpTokenRepo: DeleteRepo;
  let mockBankOAuthStateRepo: DeleteRepo;
  let mockIdempotencyRepo: DeleteRepo;
  let identityAdapter: InMemoryIdentityAdapter;
  let mockDataSource: { transaction: Mock };
  let mockAuditInsert: Mock;
  let mockConsentUpdate: Mock;
  let mockRetirementPlanRepo: DeleteRepo;

  /** The service over the current doubles; `seams` replaces the default revoker or erased check. */
  const build = (seams: { bankConsentRevoker?: object; accountDeletion?: object } = {}) =>
    new UserProfileService(
      ...([
        mockUserProfileRepo,
        mockAccountRepo,
        mockAccountDetailRepo,
        mockBankConnectionRepo,
        identityAdapter,
        mockDataSource,
        seams.bankConsentRevoker ?? { revokeAll: vi.fn().mockResolvedValue(undefined) },
        seams.accountDeletion ?? { isErased: vi.fn().mockResolvedValue(false) },
      ] as unknown as ConstructorParameters<typeof UserProfileService>),
    );

  beforeEach(() => {
    mockAuditInsert = vi.fn().mockResolvedValue(undefined);
    mockConsentUpdate = vi.fn().mockResolvedValue({ affected: 0 });
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
    mockCheckinRepo = {
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    mockImportRepo = {
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    mockMcpTokenRepo = {
      delete: vi.fn().mockResolvedValue({ affected: 2 }),
    };
    mockBankOAuthStateRepo = {
      delete: vi.fn().mockResolvedValue({ affected: 0 }),
    };
    mockIdempotencyRepo = {
      delete: vi.fn().mockResolvedValue({ affected: 2 }),
    };
    mockRetirementPlanRepo = {
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    identityAdapter = new InMemoryIdentityAdapter();
    mockDataSource = {
      transaction: vi.fn(async (cb) => {
        const fakeManager = {
          getRepository: (entityClass: { name: string }): unknown => {
            if (entityClass.name === "UserProfile") return mockUserProfileRepo;
            if (entityClass.name === "Account") return mockAccountRepo;
            if (entityClass.name === "Transaction") return mockTransactionRepo;
            if (entityClass.name === "AccountDetail") return mockAccountDetailRepo;
            if (entityClass.name === "BankConnection") return mockBankConnectionRepo;
            if (entityClass.name === "BudgetEntry") return mockBudgetEntryRepo;
            if (entityClass.name === "TaxRecord") return mockTaxRecordRepo;
            if (entityClass.name === "SnapshotCheckin") return mockCheckinRepo;
            if (entityClass.name === "ImportBatch") return mockImportRepo;
            if (entityClass.name === "McpToken") return mockMcpTokenRepo;
            if (entityClass.name === "BankOAuthState") return mockBankOAuthStateRepo;
            if (entityClass.name === "IdempotencyKey") return mockIdempotencyRepo;
            if (entityClass.name === "RetirementPlan") return mockRetirementPlanRepo;
            if (entityClass.name === "AuditEvent") return { insert: mockAuditInsert };
            if (entityClass.name === "Consent") return { update: mockConsentUpdate };
            return {};
          },
        };
        return cb(fakeManager);
      }),
    };

    service = build();
  });

  it("resets all 6 financial entity tables inside a single atomic transaction", async () => {
    mockUserProfileRepo.findOne.mockResolvedValueOnce({
      userId: "user-123",
      annualSalary: 95000,
    });

    const result = await service.resetFinancialData("user-123", "user@example.com");

    expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    expect(mockAuditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-123", action: "financial_data.reset" }),
    );
    expect(mockConsentUpdate).toHaveBeenCalledTimes(2);
    expect(mockAccountRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });
    expect(mockTransactionRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });
    expect(mockBankConnectionRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });
    expect(mockBudgetEntryRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });
    expect(mockTaxRecordRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });
    expect(mockAccountDetailRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });
    expect(mockCheckinRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });
    expect(mockImportRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });
    // M-PRIV1: MCP tokens are revoked (deleted).
    expect(mockMcpTokenRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });
    // Registry table (BE-09): stored create responses echo the erased rows.
    expect(mockIdempotencyRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });

    expect(result.success).toBe(true);
    expect(result.profile.hasResetFinancialData).toBe(true);
    expect(result.profile.annualSalary).toBeNull();
  });

  it("a reset shows the setup checklist again (decision 13)", async () => {
    mockUserProfileRepo.findOne.mockResolvedValueOnce({
      userId: "user-123",
      setupChecklistCompletedSteps: ["budget"],
      setupChecklistDismissed: true,
    });
    const result = await service.resetFinancialData("user-123");
    expect(result.profile.setupChecklistDismissed).toBe(false);
    expect(result.profile.setupChecklistCompletedSteps).toEqual([]);
  });

  it("clears this profile's migration before-images on reset, so no rollback restores them", async () => {
    // Slice 6 security review: the before-images hang off the profile row, which a reset keeps.
    mockUserProfileRepo.findOne.mockResolvedValueOnce({ id: "profile-9", userId: "user-123" });
    await service.resetFinancialData("user-123");
    const deletes = mockUserProfileRepo.query.mock.calls.filter(([sql]) =>
      String(sql).startsWith("DELETE"),
    );
    expect(deletes.map(([sql, params]) => [sql, params])).toEqual([
      ['DELETE FROM "pension_rates_backfill" WHERE "profile_id" = $1', ["profile-9"]],
      ['DELETE FROM "student_loan_plan_backfill" WHERE "profile_id" = $1', ["profile-9"]],
      ['DELETE FROM "paye_salary_record_backfill" WHERE "profile_id" = $1', ["profile-9"]],
    ]);
  });

  it("clears the leftover financial profile facts on reset (M-PRIV1) and keeps identity", async () => {
    mockUserProfileRepo.findOne.mockResolvedValueOnce({
      userId: "user-123",
      firstName: "Jane",
      currency: "GBP",
      employmentType: "employed",
      taxRegion: "SCOTLAND",
      birthYear: 1990,
      studentLoanPlans: ["PLAN_2"],
      housingStatus: "renting",
      monthlyHousingCost: 900,
      monthlyOtherOutgoings: 300,
      savingsDefaultInterestRate: 4.2,
    });
    await service.resetFinancialData("user-123");
    const saved = at(mockUserProfileRepo.save.mock.calls, -1)[0];
    expect(saved).toMatchObject({
      firstName: "Jane",
      currency: "GBP",
      employmentType: null,
      taxRegion: null,
      birthYear: null,
      studentLoanPlans: null,
      housingStatus: null,
      monthlyHousingCost: null,
      monthlyOtherOutgoings: null,
      savingsDefaultInterestRate: 5,
      hasResetFinancialData: true,
    });
  });

  it("calls the bank-revoke seam with connection identifiers before the reset", async () => {
    const revokeAll = vi.fn().mockResolvedValue(undefined);
    mockBankConnectionRepo.find = vi
      .fn()
      .mockResolvedValue([{ id: "c1", institutionId: "monzo", authType: "oauth" }]);
    const withSeam = build({ bankConsentRevoker: { revokeAll } });
    mockUserProfileRepo.findOne.mockResolvedValueOnce({ userId: "user-123" });
    await withSeam.resetFinancialData("user-123");
    expect(revokeAll).toHaveBeenCalledWith("user-123", [
      { id: "c1", institutionId: "monzo", authType: "oauth" },
    ]);
    expect(revokeAll.mock.invocationCallOrder[0]).toBeLessThan(
      at(mockDataSource.transaction.mock.invocationCallOrder, 0),
    );
    // A failing seam never blocks the reset.
    revokeAll.mockRejectedValueOnce(new Error("bank down"));
    vi.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    mockUserProfileRepo.findOne.mockResolvedValueOnce({ userId: "user-123" });
    await expect(withSeam.resetFinancialData("user-123")).resolves.toMatchObject({
      success: true,
    });
  });

  it("refuses to create a fresh profile for an erased account (no row recreated after deletion)", async () => {
    const accountDeletion = { isErased: vi.fn().mockResolvedValue(true) };
    const guarded = build({ accountDeletion });
    mockUserProfileRepo.findOne.mockResolvedValueOnce(null);
    await expect(guarded.getProfile("user-gone")).rejects.toThrow("This account has been deleted.");
    expect(mockUserProfileRepo.save).not.toHaveBeenCalled();
  });

  it("logs financial_data_reset only after the transaction commits", async () => {
    const log = vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    const resetEvents = () =>
      log.mock.calls.filter(([m]) => JSON.stringify(m).includes("financial_data_reset"));

    mockDataSource.transaction.mockRejectedValueOnce(new Error("rollback"));
    await expect(service.resetFinancialData("user-123")).rejects.toThrow("rollback");
    expect(resetEvents()).toHaveLength(0);

    mockUserProfileRepo.findOne.mockResolvedValueOnce({ userId: "user-123" });
    await service.resetFinancialData("user-123");
    expect(resetEvents()).toHaveLength(1);
    expect((at(resetEvents(), 0)[0] as { removed: { snapshotCheckins: number } }).removed).toEqual(
      expect.objectContaining({ snapshotCheckins: 1 }),
    );
    log.mockRestore();
  });

  describe("retired profile fields (system audit slice 9 part two)", () => {
    // The columns stay until the drop PR; nothing reads or writes them through the API.
    const RETIRED = {
      hasBuyToLet: true,
      buyToLetCount: 2,
      buyToLetPropertyValue: "165000.00",
      buyToLetMonthlyRental: "875.00",
      buyToLetMortgageBalance: "92000.00",
      buyToLetMortgageRate: "5.10",
      buyToLetMortgageType: "repayment",
      monthlySavingsTarget: "300.00",
      savingsAllocationMode: "total",
      savingsDefaultInterestRate: "4.25",
      dashboardWidgetSizes: { accounts: "normal" },
      dashboardWidgetConfig: { accounts: { compact: true } },
    };

    it("never returns them, even when the stored row holds them", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue({ id: "p1", userId: "user-123", ...RETIRED });
      const result = await service.getProfile("user-123");
      expect(Object.keys(RETIRED).filter((key) => key in result)).toEqual([]);
    });

    it("saves the other fields of an old-shaped request and leaves the retired columns untouched", async () => {
      const row = { id: "p1", userId: "user-123", ...RETIRED };
      mockUserProfileRepo.findOne.mockResolvedValue(row);
      const changed = {
        hasBuyToLet: false,
        buyToLetCount: 0,
        buyToLetPropertyValue: 1,
        buyToLetMonthlyRental: 1,
        buyToLetMortgageBalance: 1,
        buyToLetMortgageRate: 1,
        buyToLetMortgageType: "interest-only",
        monthlySavingsTarget: 1,
        savingsAllocationMode: "per_account",
        savingsDefaultInterestRate: 1,
        dashboardWidgetSizes: {},
        dashboardWidgetConfig: {},
      };
      await service.updateProfile("user-123", { ...changed, annualSalary: 41000 } as never);
      const saved = at(mockUserProfileRepo.save.mock.calls, -1)[0];
      expect(saved).toMatchObject(RETIRED);
      expect(saved).toMatchObject({ annualSalary: 41000 });
    });
  });

  it("filters the retired forecast module key on read without touching the stored row", async () => {
    const stored = {
      id: "profile-1",
      userId: "user-123",
      enabledPages: ["accounts", "forecast", "tax"],
      dashboardWidgets: ["accounts", "forecast"],
      dashboardWidgetOrder: ["forecast", "accounts"],
    };
    mockUserProfileRepo.findOne.mockResolvedValue(stored);

    const result = await service.getProfile("user-123");

    expect(result.enabledPages).toEqual(["accounts", "tax"]);
    expect(result.dashboardWidgets).toEqual(["accounts"]);
    expect(result.dashboardWidgetOrder).toEqual(["accounts"]);
    expect(mockUserProfileRepo.save).not.toHaveBeenCalled();
    expect(stored.enabledPages).toContain("forecast");
  });

  it("drops unknown, retired and repeated section ids from a stored order on read", async () => {
    mockUserProfileRepo.findOne.mockResolvedValue({
      id: "profile-1",
      userId: "user-123",
      dashboardWidgetOrder: ["tax", "forecast", "retirement", "tax", "debt", ""],
    });
    expect((await service.getProfile("user-123")).dashboardWidgetOrder).toEqual(["tax", "debt"]);
  });

  it("has no saved section order for a new profile or a stored null, so the dashboard uses its default", async () => {
    mockUserProfileRepo.findOne.mockResolvedValue(null);
    const created = await service.getProfile("user-123");
    expect(mockUserProfileRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ dashboardWidgetOrder: [] }),
    );
    expect(created.dashboardWidgetOrder).toEqual([]);

    mockUserProfileRepo.findOne.mockResolvedValue({
      id: "profile-1",
      userId: "user-123",
      dashboardWidgetOrder: null,
    });
    expect((await service.getProfile("user-123")).dashboardWidgetOrder).toEqual([]);
  });

  describe("pension answers are never assumed (owner decision 3)", () => {
    const UNANSWERED = {
      pensionPercent: null,
      pensionEmployerPercent: null,
      isSalarySacrifice: null,
    };

    it("getProfile creates a new profile with the pension answers not set", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue(null);

      const result = await service.getProfile("user-123");

      expect(mockUserProfileRepo.create).toHaveBeenCalledWith(expect.objectContaining(UNANSWERED));
      expect(result).toMatchObject(UNANSWERED);
      expect(result.isSalarySacrificeEmployerNi).toBe(false);
    });

    it("updateProfile creates a new profile with the pension answers not set", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue(null);

      const result = await service.updateProfile("user-123", { currency: "EUR" });

      expect(mockUserProfileRepo.create).toHaveBeenCalledWith(expect.objectContaining(UNANSWERED));
      expect(result).toMatchObject(UNANSWERED);
    });

    it("updateChecklist creates a new profile with the pension answers not set", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue(null);

      await service.updateChecklist("user-123", { step: "profile", completed: true });

      expect(mockUserProfileRepo.create).toHaveBeenCalledWith(expect.objectContaining(UNANSWERED));
    });

    it("reads stored nulls as not set, never 5%, 3% or off", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue({
        id: "profile-1",
        userId: "user-123",
        ...UNANSWERED,
      });

      const result = await service.getProfile("user-123");

      expect(result).toMatchObject(UNANSWERED);
    });

    it("shows a saved answer as saved, including a chosen 5% and 3% and false", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue({
        id: "profile-1",
        userId: "user-123",
        pensionPercent: "5.0000",
        pensionEmployerPercent: "3.0000",
        isSalarySacrifice: false,
      });

      const result = await service.getProfile("user-123");

      expect(result).toMatchObject({
        pensionPercent: 5,
        pensionEmployerPercent: 3,
        isSalarySacrifice: false,
      });
    });

    it("saves null to clear an answer", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue({
        id: "profile-1",
        userId: "user-123",
        pensionPercent: 6,
        pensionEmployerPercent: 4,
        isSalarySacrifice: true,
      });

      const result = await service.updateProfile("user-123", UNANSWERED);

      expect(mockUserProfileRepo.save).toHaveBeenCalledWith(expect.objectContaining(UNANSWERED));
      expect(result).toMatchObject(UNANSWERED);
    });
  });

  describe("a typed take-home never outlives a salary change (slice 6)", () => {
    const stored = () => ({
      id: "profile-1",
      userId: "user-123",
      annualSalary: 40000,
      monthlyTakeHome: 2600,
    });

    it("clears the take-home when the salary is saved without one", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue(stored());
      const result = await service.updateProfile("user-123", { annualSalary: 52000 });
      expect(mockUserProfileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ annualSalary: 52000, monthlyTakeHome: null }),
      );
      expect(result.monthlyTakeHome).toBeNull();
    });

    it("clears the take-home when the salary is cleared without one", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue(stored());
      const result = await service.updateProfile("user-123", { annualSalary: null });
      expect(result.annualSalary).toBeNull();
      expect(result.monthlyTakeHome).toBeNull();
    });

    it("keeps the typed take-home when both are sent (onboarding's take-home mode)", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue(stored());
      const result = await service.updateProfile("user-123", {
        annualSalary: null,
        monthlyTakeHome: 2450,
      });
      expect(result.annualSalary).toBeNull();
      expect(result.monthlyTakeHome).toBe(2450);
    });

    it("leaves the take-home alone when neither is sent", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue(stored());
      const result = await service.updateProfile("user-123", { currency: "EUR" });
      expect(result.monthlyTakeHome).toBe(2600);
    });
  });

  describe("check-in day", () => {
    it("saves a chosen day and formats it, and null clears it", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue({ id: "profile-1", userId: "user-123" });

      const saved = await service.updateProfile("user-123", { checkInDay: 28 });
      expect(at(mockUserProfileRepo.save.mock.calls, -1)[0]).toMatchObject({ checkInDay: 28 });
      expect(saved.checkInDay).toBe(28);

      const cleared = await service.updateProfile("user-123", { checkInDay: null });
      expect(cleared.checkInDay).toBeNull();
    });

    it("reads a profile that never chose a day as null", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue({ id: "profile-1", userId: "user-123" });

      const result = await service.getProfile("user-123");

      expect(result.checkInDay).toBeNull();
    });

    it("rejects a day outside 1 to 31 with a 400", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue({ id: "profile-1", userId: "user-123" });

      for (const checkInDay of [0, 32, 2.5]) {
        await expect(service.updateProfile("user-123", { checkInDay })).rejects.toThrow(
          /checkInDay must be a whole day/,
        );
      }
    });
  });

  describe("lazy profile creation", () => {
    const uniqueViolation = () => Object.assign(new Error("duplicate key"), { code: "23505" });
    const wrappedViolation = () => {
      return Object.assign(new Error("duplicate key value violates unique constraint"), {
        name: "QueryFailedError",
        driverError: { code: "23505" },
      });
    };

    it("getProfile recovers when a concurrent request created the profile (err.code)", async () => {
      const existing = { id: "profile-9", userId: "user-123", currency: "GBP" };
      mockUserProfileRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existing);
      mockUserProfileRepo.save.mockRejectedValueOnce(uniqueViolation());

      const result = await service.getProfile("user-123");

      expect(result.id).toBe("profile-9");
      expect(result.userId).toBe("user-123");
      expect(mockUserProfileRepo.findOne).toHaveBeenCalledTimes(2);
    });

    it("recognises a TypeORM QueryFailedError via driverError.code", async () => {
      const existing = { id: "profile-9", userId: "user-123" };
      mockUserProfileRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existing);
      mockUserProfileRepo.save.mockRejectedValueOnce(wrappedViolation());

      const result = await service.getProfile("user-123");

      expect(result.id).toBe("profile-9");
    });

    it("two concurrent getProfile calls resolve to the same profile id", async () => {
      let stored: Record<string, unknown> | null = null;
      mockUserProfileRepo.findOne.mockImplementation(async () => {
        await Promise.resolve();
        return stored;
      });
      mockUserProfileRepo.save.mockImplementation(async (entity: Record<string, unknown>) => {
        await Promise.resolve();
        if (stored) throw wrappedViolation();
        stored = { id: "profile-1", ...entity };
        return stored;
      });

      const [a, b] = await Promise.all([
        service.getProfile("user-123"),
        service.getProfile("user-123"),
      ]);

      expect(a.id).toBe("profile-1");
      expect(b.id).toBe("profile-1");
    });

    it("other save errors still propagate", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue(null);
      mockUserProfileRepo.save.mockRejectedValueOnce(
        Object.assign(new Error("connection lost"), { code: "08006" }),
      );

      await expect(service.getProfile("user-123")).rejects.toThrow("connection lost");
      expect(mockUserProfileRepo.findOne).toHaveBeenCalledTimes(1);
    });

    it("rethrows the violation when the row still cannot be re-read", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue(null);
      mockUserProfileRepo.save.mockRejectedValueOnce(uniqueViolation());

      await expect(service.getProfile("user-123")).rejects.toThrow("duplicate key");
    });

    it("updateProfile recovers from a concurrent create and applies the update", async () => {
      const existing = { id: "profile-9", userId: "user-123", currency: "GBP" };
      mockUserProfileRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existing);
      mockUserProfileRepo.save
        .mockRejectedValueOnce(uniqueViolation())
        .mockImplementationOnce((entity: Record<string, unknown>) => Promise.resolve(entity));

      const result = await service.updateProfile("user-123", { currency: "EUR" });

      expect(result.id).toBe("profile-9");
      expect(result.currency).toBe("EUR");
    });

    it("updateChecklist recovers from a concurrent create", async () => {
      const existing = { id: "profile-9", userId: "user-123", setupChecklistCompletedSteps: [] };
      mockUserProfileRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existing);
      mockUserProfileRepo.save
        .mockRejectedValueOnce(uniqueViolation())
        .mockImplementationOnce((entity: Record<string, unknown>) => Promise.resolve(entity));

      const result = await service.updateChecklist("user-123", {
        step: "profile",
        completed: true,
      });

      expect(result.setupChecklistCompletedSteps).toEqual(["profile"]);
    });
  });

  it("delegates name updates to the UserIdentityAdapter seam", async () => {
    mockUserProfileRepo.findOne.mockResolvedValueOnce({
      userId: "user-123",
      firstName: "Jane",
      lastName: "Doe",
    });

    await service.updateProfile("user-123", { firstName: "Janet", lastName: "Smith" });

    expect(identityAdapter.updatedNames).toEqual([
      { userId: "user-123", firstName: "Janet", lastName: "Smith" },
    ]);
  });

  it("sends the reset to the caller's own email, never a supplied one", async () => {
    identityAdapter.emails.set("user-123", "me@example.com");
    const res = await Reflect.apply(service.sendPasswordReset, service, ["user-123", "victim@x"]);

    expect(res).toEqual({ success: true });
    expect(identityAdapter.resetEmails).toEqual(["me@example.com"]);
  });

  it("fails (503) when the user's email cannot be resolved", async () => {
    await expect(service.sendPasswordReset("nobody")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(identityAdapter.resetEmails).toEqual([]);
  });

  it("fails (503) with a generic message when the identity provider throws, logging only class and code", async () => {
    vi.spyOn(identityAdapter, "getUserEmail").mockRejectedValue(
      Object.assign(new Error("secret@pii.com not found"), { code: "entity_not_found" }),
    );
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    const err = await service.sendPasswordReset("user-123").catch((e) => e);
    expect(err).toBeInstanceOf(ServiceUnavailableException);
    expect(JSON.stringify(err.getResponse())).not.toContain("pii.com");
    const logged = warn.mock.calls.flat().join(" ");
    expect(logged).toContain("entity_not_found");
    expect(logged).not.toContain("pii.com");
    warn.mockRestore();
  });

  it("fails (503) when sending the reset throws", async () => {
    identityAdapter.emails.set("user-123", "me@example.com");
    vi.spyOn(identityAdapter, "sendPasswordReset").mockRejectedValue(new Error("boom me@x"));
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    await expect(service.sendPasswordReset("user-123")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    warn.mockRestore();
  });

  it("acceptTerms writes a terms consent under a per-user lock, once per version (M-PRIV3)", async () => {
    const insert = vi.fn().mockResolvedValue(undefined);
    const count = vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    const query = vi.fn().mockResolvedValue([]);
    mockDataSource.transaction.mockImplementation(async (cb) =>
      cb({ query, getRepository: () => ({ count, insert }) }),
    );

    await expect(service.acceptTerms("user-123", "2026-11-01")).resolves.toEqual({
      recorded: true,
    });
    await expect(service.acceptTerms("user-123", "2026-11-01")).resolves.toEqual({
      recorded: false,
    });
    expect(query).toHaveBeenCalledWith("SELECT pg_advisory_xact_lock(hashtext($1))", [
      "terms:user-123",
    ]);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-123", kind: "terms", version: "2026-11-01" }),
    );
  });
});
