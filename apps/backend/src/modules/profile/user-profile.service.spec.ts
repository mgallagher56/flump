import { MAX_BUDGET_CATEGORY_NAME_LENGTH, MAX_CUSTOM_BUDGET_CATEGORIES } from "@flump/api-contract";
import { BadRequestException, Logger, ServiceUnavailableException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { InMemoryIdentityAdapter } from "../../identity/identity.adapter";
import { at } from "../../testing/must";
import { DATA_LOCK_STATEMENT } from "../privacy/user-data-lock";
import { EMAIL_LOOKUP_TIMEOUT_MS, UserProfileService } from "./user-profile.service";

type DeleteRepo = { delete: Mock };

describe("UserProfileService (Deep Module)", () => {
  let service: UserProfileService;
  let mockUserProfileRepo: { findOne: Mock; save: Mock; create: Mock; query: Mock };
  let mockAccountRepo: { find: Mock; delete: Mock };
  let mockTransactionRepo: DeleteRepo;
  let mockAccountDetailRepo: DeleteRepo;
  let mockAccountGoalRepo: DeleteRepo;
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
  let mockManagerQuery: Mock;
  let mockRetirementPlanRepo: DeleteRepo;
  let mockWorkLogEntryRepo: DeleteRepo;
  let mockInvoiceRepo: DeleteRepo;
  let mockInvoicingSettingsRepo: DeleteRepo;
  let mockWellbeingRepo: DeleteRepo;

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
    mockAccountGoalRepo = {
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
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
    mockWorkLogEntryRepo = {
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    mockInvoiceRepo = {
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    mockInvoicingSettingsRepo = {
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    mockWellbeingRepo = {
      delete: vi.fn().mockResolvedValue({ affected: 2 }),
    };
    identityAdapter = new InMemoryIdentityAdapter();
    mockManagerQuery = vi.fn().mockResolvedValue([]);
    mockDataSource = {
      transaction: vi.fn(async (cb) => {
        const fakeManager = {
          query: mockManagerQuery,
          getRepository: (entityClass: { name: string }): unknown => {
            if (entityClass.name === "UserProfile") return mockUserProfileRepo;
            if (entityClass.name === "Account") return mockAccountRepo;
            if (entityClass.name === "Transaction") return mockTransactionRepo;
            if (entityClass.name === "AccountDetail") return mockAccountDetailRepo;
            if (entityClass.name === "AccountGoal") return mockAccountGoalRepo;
            if (entityClass.name === "BankConnection") return mockBankConnectionRepo;
            if (entityClass.name === "BudgetEntry") return mockBudgetEntryRepo;
            if (entityClass.name === "TaxRecord") return mockTaxRecordRepo;
            if (entityClass.name === "SnapshotCheckin") return mockCheckinRepo;
            if (entityClass.name === "ImportBatch") return mockImportRepo;
            if (entityClass.name === "McpToken") return mockMcpTokenRepo;
            if (entityClass.name === "BankOAuthState") return mockBankOAuthStateRepo;
            if (entityClass.name === "IdempotencyKey") return mockIdempotencyRepo;
            if (entityClass.name === "RetirementPlan") return mockRetirementPlanRepo;
            if (entityClass.name === "WorkLogEntry") return mockWorkLogEntryRepo;
            if (entityClass.name === "Invoice") return mockInvoiceRepo;
            if (entityClass.name === "InvoicingSettings") return mockInvoicingSettingsRepo;
            if (entityClass.name === "WellbeingAnswer") return mockWellbeingRepo;
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
    expect(mockAccountGoalRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });
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
      ['DELETE FROM "profile_column_drop_backfill" WHERE "profile_id" = $1', ["profile-9"]],
      ['DELETE FROM "paye_salary_record_backfill" WHERE "profile_id" = $1', ["profile-9"]],
      ['DELETE FROM "take_home_salary_backfill" WHERE "profile_id" = $1', ["profile-9"]],
      ['DELETE FROM "reset_pension_zeros_backfill" WHERE "profile_id" = $1', ["profile-9"]],
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

  it("takes the per-user lock shared with erasure before it checks the tombstone or deletes", async () => {
    // Without the lock a reset could read "not erased", then recreate the profile row an
    // erasure committing alongside it had just deleted.
    const isErased = vi.fn().mockResolvedValue(false);
    const locked = build({ accountDeletion: { isErased } });
    mockUserProfileRepo.findOne.mockResolvedValueOnce({ userId: "user-123" });
    await locked.resetFinancialData("user-123");
    expect(mockManagerQuery).toHaveBeenCalledWith(DATA_LOCK_STATEMENT, ["user-data:user-123"]);
    const lockOrder = at(mockManagerQuery.mock.invocationCallOrder, 0);
    // The check inside the transaction (the one given the manager) runs after the lock.
    const inTx = isErased.mock.calls.findIndex((call) => call[1] !== undefined);
    expect(inTx).toBeGreaterThanOrEqual(0);
    expect(lockOrder).toBeLessThan(at(isErased.mock.invocationCallOrder, inTx));
    expect(lockOrder).toBeLessThan(at(mockAccountRepo.delete.mock.invocationCallOrder, 0));
  });

  it("an erasure that commits after the early check still stops the reset inside the lock", async () => {
    // The early check sees no tombstone; the erasure commits; the in-transaction check, made
    // once the lock is held, sees it and nothing is deleted or saved.
    const isErased = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const guarded = build({ accountDeletion: { isErased } });
    await expect(guarded.resetFinancialData("user-gone")).rejects.toThrow(
      "This account has been deleted.",
    );
    expect(mockManagerQuery).toHaveBeenCalledWith(DATA_LOCK_STATEMENT, ["user-data:user-gone"]);
    // The refusing check is the second one (inside the transaction), and it runs after the lock.
    expect(isErased).toHaveBeenCalledTimes(2);
    expect(at(mockManagerQuery.mock.invocationCallOrder, 0)).toBeLessThan(
      at(isErased.mock.invocationCallOrder, 1),
    );
    expect(mockAccountRepo.delete).not.toHaveBeenCalled();
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

  describe("displayName and hasSecondIncome (system audit slice 9 part three)", () => {
    // Their only reader was the deleted mobile app. The columns stay until the drop PR (and stay
    // in the export); the API neither returns nor writes them, and the contract refuses them on
    // PATCH. secondIncomeMonthly is unaffected.
    const STORED = { displayName: "Sam Taylor", hasSecondIncome: true };

    it("never returns them from a read, an update or a checklist change", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue({ id: "p1", userId: "user-123", ...STORED });
      const read = await service.getProfile("user-123");
      const updated = await service.updateProfile("user-123", { annualSalary: 41000 });
      const checklist = await service.updateChecklist("user-123", { dismissed: true });
      for (const result of [read, updated, checklist]) {
        expect(Object.keys(STORED).filter((key) => key in result)).toEqual([]);
      }
    });

    it("an update leaves both stored columns untouched", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue({ id: "p1", userId: "user-123", ...STORED });
      await service.updateProfile("user-123", { secondIncomeMonthly: 400, annualSalary: 41000 });
      const saved = at(mockUserProfileRepo.save.mock.calls, -1)[0];
      expect(saved).toMatchObject(STORED);
      expect(saved).toMatchObject({ annualSalary: 41000, secondIncomeMonthly: 400 });
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

  describe("wellbeing questions switch (E35 W5)", () => {
    it("reads a profile with no stored choice as on", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue({ id: "profile-1", userId: "user-123" });
      expect((await service.getProfile("user-123")).wellbeingQuestions).toBe(true);
    });

    it("switching off saves the switch and deletes the answers in one transaction", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue({
        id: "profile-1",
        userId: "user-123",
        wellbeingQuestions: true,
      });
      const saved = await service.updateProfile("user-123", { wellbeingQuestions: false });
      expect(saved.wellbeingQuestions).toBe(false);
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(at(mockUserProfileRepo.save.mock.calls, -1)[0]).toMatchObject({
        wellbeingQuestions: false,
      });
      expect(mockWellbeingRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });
    });

    it("a failed delete fails the save, so the switch never goes off with answers left", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue({ id: "profile-1", userId: "user-123" });
      mockWellbeingRepo.delete.mockRejectedValueOnce(new Error("connection lost"));
      await expect(
        service.updateProfile("user-123", { wellbeingQuestions: false }),
      ).rejects.toThrow("connection lost");
    });

    it("switching on, or an update that leaves the switch alone, deletes nothing", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue({
        id: "profile-1",
        userId: "user-123",
        wellbeingQuestions: false,
      });
      const on = await service.updateProfile("user-123", { wellbeingQuestions: true });
      expect(on.wellbeingQuestions).toBe(true);
      await service.updateProfile("user-123", { checkInDay: 5 });
      expect(mockWellbeingRepo.delete).not.toHaveBeenCalled();
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it("rejects a switch value that is not a boolean with a 400", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue({ id: "profile-1", userId: "user-123" });
      await expect(
        service.updateProfile("user-123", { wellbeingQuestions: "no" as unknown as boolean }),
      ).rejects.toThrow(/wellbeingQuestions must be true or false/);
      expect(mockWellbeingRepo.delete).not.toHaveBeenCalled();
    });

    it("the financial data reset keeps the answers and the switch", async () => {
      mockUserProfileRepo.findOne.mockResolvedValueOnce({
        userId: "user-123",
        wellbeingQuestions: false,
      });
      await service.resetFinancialData("user-123", "user@example.com");
      expect(mockWellbeingRepo.delete).not.toHaveBeenCalled();
      expect(at(mockUserProfileRepo.save.mock.calls, -1)[0]).toMatchObject({
        wellbeingQuestions: false,
      });
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

  describe("every profile read and write is scoped to the caller", () => {
    type Row = Record<string, unknown>;
    /** A findOne over `table` that honours `where`, as the database would. */
    const findOneOver =
      (table: Row[]) =>
      async (options?: { where?: Row }): Promise<Row | null> =>
        table.find((row) =>
          Object.entries(options?.where ?? {}).every(([key, value]) => row[key] === value),
        ) ?? null;
    // Another user's row sits first, so a lookup that dropped the owner filter would return it.
    const theirs = (): Row => ({ id: "profile-theirs", userId: "user-999", currency: "USD" });

    it("re-reads the caller's own row after losing the first-insert race", async () => {
      const table = [theirs()];
      mockUserProfileRepo.findOne.mockImplementation(findOneOver(table));
      mockUserProfileRepo.save.mockImplementationOnce(async () => {
        // The concurrent request's insert lands first; this one hits the unique user_id.
        table.push({ id: "profile-own", userId: "user-123", currency: "GBP" });
        throw Object.assign(new Error("duplicate key"), { code: "23505" });
      });

      const result = await service.getProfile("user-123");

      expect(result).toMatchObject({ id: "profile-own", userId: "user-123" });
    });

    it("claims, reads and writes only the caller's row on a conditional update", async () => {
      const table = [theirs(), { id: "profile-own", userId: "user-123", currency: "GBP" }];
      const qb = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({ affected: 1 }),
      };
      const scoped = {
        createQueryBuilder: vi.fn().mockReturnValue(qb),
        findOne: vi.fn(findOneOver(table)),
        save: vi.fn(async (row: Row) => row),
      };
      Object.assign(mockUserProfileRepo, {
        manager: {
          transaction: async (work: (em: unknown) => Promise<unknown>) =>
            work({ getRepository: () => scoped }),
        },
      });

      const result = await service.updateProfile(
        "user-123",
        { currency: "EUR" },
        undefined,
        new Date("2026-11-20T09:00:00.000Z"),
      );

      expect(result).toMatchObject({ id: "profile-own", userId: "user-123", currency: "EUR" });
      expect(table[0]).toEqual(theirs());
      // The version claim is an UPDATE: its owner filter is the tenancy contract.
      const [clause, params] = qb.where.mock.calls[0] ?? [];
      expect(clause).toContain('"user_id" = :user_id');
      expect(params).toMatchObject({ user_id: "user-123" });
    });

    it("refuses a reset for an erased account before anything is touched", async () => {
      const guarded = build({ accountDeletion: { isErased: vi.fn().mockResolvedValue(true) } });
      await expect(guarded.resetFinancialData("user-gone")).rejects.toThrow(
        "This account has been deleted.",
      );
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
      expect(mockUserProfileRepo.save).not.toHaveBeenCalled();
    });

    it("re-checks isErased inside the reset transaction with the transaction manager", async () => {
      const isErased = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      const guarded = build({ accountDeletion: { isErased } });
      await expect(guarded.resetFinancialData("user-raced")).rejects.toThrow(
        "This account has been deleted.",
      );
      expect(isErased).toHaveBeenCalledTimes(2);
      expect(isErased.mock.calls[1]?.[1]).toBeDefined();
      expect(mockUserProfileRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("reset with a migration before-image table that was never created", () => {
    it("skips that table instead of failing the reset", async () => {
      mockUserProfileRepo.findOne.mockResolvedValueOnce({ id: "profile-9", userId: "user-123" });
      // to_regclass answers null for a missing table, and a DELETE on it would fail in Postgres.
      mockUserProfileRepo.query.mockImplementation(async (sql: string) => {
        if (sql.startsWith("SELECT")) return [{ t: null }];
        throw new Error("relation does not exist");
      });

      await expect(service.resetFinancialData("user-123")).resolves.toMatchObject({
        success: true,
      });
    });
  });

  describe("name sync with the identity provider", () => {
    it("sends the saved first name when only the last name changes", async () => {
      mockUserProfileRepo.findOne.mockResolvedValueOnce({
        userId: "user-123",
        firstName: "Jane",
        lastName: "Doe",
      });
      await service.updateProfile("user-123", { lastName: "Smith" });
      expect(identityAdapter.updatedNames).toEqual([
        { userId: "user-123", firstName: "Jane", lastName: "Smith" },
      ]);
    });

    it("sends the saved last name when only the first name changes", async () => {
      mockUserProfileRepo.findOne.mockResolvedValueOnce({
        userId: "user-123",
        firstName: "Jane",
        lastName: "Doe",
      });
      await service.updateProfile("user-123", { firstName: "Janet" });
      expect(identityAdapter.updatedNames).toEqual([
        { userId: "user-123", firstName: "Janet", lastName: "Doe" },
      ]);
    });
  });

  describe("fields an update saves", () => {
    beforeEach(() => {
      mockUserProfileRepo.findOne.mockResolvedValue({ id: "profile-1", userId: "user-123" });
    });

    it("saves a sent avatar address and rental income", async () => {
      const result = await service.updateProfile("user-123", {
        avatarUrl: "https://example.test/avatar.png",
        rentalIncomeMonthly: 500,
      });
      expect(result).toMatchObject({
        avatarUrl: "https://example.test/avatar.png",
        rentalIncomeMonthly: 500,
      });
    });

    it("saves the custom budget categories, and a non-list clears them", async () => {
      const saved = await service.updateProfile("user-123", {
        customBudgetCategories: ["holidays", "gifts"],
      });
      expect(saved.customBudgetCategories).toEqual(["holidays", "gifts"]);
      const cleared = await service.updateProfile("user-123", {
        customBudgetCategories: null,
      } as never);
      expect(cleared.customBudgetCategories).toEqual([]);
    });

    it("accepts the category limits exactly and refuses one over either", async () => {
      // At the limits: MAX categories, each MAX characters long.
      const atLimit = Array.from({ length: MAX_CUSTOM_BUDGET_CATEGORIES }, (_, i) =>
        `${i}`.padStart(MAX_BUDGET_CATEGORY_NAME_LENGTH, "c"),
      );
      const saved = await service.updateProfile("user-123", { customBudgetCategories: atLimit });
      expect(saved.customBudgetCategories).toHaveLength(MAX_CUSTOM_BUDGET_CATEGORIES);

      const refusals = [
        [...atLimit, "one more"],
        ["c".repeat(MAX_BUDGET_CATEGORY_NAME_LENGTH + 1)],
        [42],
      ];
      for (const customBudgetCategories of refusals) {
        await expect(
          service.updateProfile("user-123", { customBudgetCategories } as never),
        ).rejects.toBeInstanceOf(BadRequestException);
      }
    });
  });

  describe("checklist changes", () => {
    it("returns the caller's email with a dismissal, and null without one", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue({ id: "profile-1", userId: "user-123" });
      const email = ["person", "example.test"].join("@");
      const withEmail = await service.updateChecklist("user-123", { dismissed: true }, email);
      expect(withEmail.email).toBe(email);
      const without = await service.updateChecklist("user-123", { dismissed: true });
      expect(without.email).toBeNull();
    });

    it("leaves the list as it is when a step that was never done is marked not done", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue({
        id: "profile-1",
        userId: "user-123",
        setupChecklistCompletedSteps: ["profile", "accounts"],
      });
      const result = await service.updateChecklist("user-123", {
        step: "budget",
        completed: false,
      });
      expect(result.setupChecklistCompletedSteps).toEqual(["profile", "accounts"]);
    });
  });

  describe("getEmail", () => {
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("returns the trimmed token email claim when present without calling WorkOS", async () => {
      const claimEmail = ["claim", "example.com"].join("@");
      const getUserEmail = vi.spyOn(identityAdapter, "getUserEmail");

      await expect(service.getEmail("user-123", claimEmail)).resolves.toBe(claimEmail);
      await expect(service.getEmail("user-123", `  ${claimEmail}  `)).resolves.toBe(claimEmail);
      expect(getUserEmail).not.toHaveBeenCalled();
    });

    it("resolves and trims via the identity adapter when the token claim is absent or blank, clearing the timer", async () => {
      const storedEmail = ["person", "example.com"].join("@");
      identityAdapter.emails.set("user-123", `  ${storedEmail}  `);
      const getUserEmail = vi.spyOn(identityAdapter, "getUserEmail");
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

      await expect(service.getEmail("user-123")).resolves.toBe(storedEmail);
      expect(clearTimeoutSpy).toHaveBeenCalled();

      await expect(service.getEmail("user-123", "   ")).resolves.toBe(storedEmail);
      expect(getUserEmail).toHaveBeenCalledTimes(2);
      expect(getUserEmail).toHaveBeenCalledWith("user-123");

      identityAdapter.emails.set("user-123", "   ");
      await expect(service.getEmail("user-123")).resolves.toBeNull();
    });

    it("returns null without warning or calling WorkOS when userId is empty or no email exists", async () => {
      const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
      const getUserEmail = vi.spyOn(identityAdapter, "getUserEmail");

      await expect(service.getEmail("")).resolves.toBeNull();
      expect(getUserEmail).not.toHaveBeenCalled();

      await expect(service.getEmail("user-missing")).resolves.toBeNull();
      expect(warn).not.toHaveBeenCalled();
    });

    it("returns null and logs only error class/code/status (never email or userId) when WorkOS throws", async () => {
      const sampleEmail = ["secret.person", "example.com"].join("@");
      const userId = "user_01SECRETID";
      const err = Object.assign(new Error(`WorkOS failed for ${userId} (${sampleEmail})`), {
        name: "HttpClientError",
        code: "ECONNRESET",
        status: 502,
      });
      vi.spyOn(identityAdapter, "getUserEmail").mockRejectedValueOnce(err);
      const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
      const log = vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
      const errorLog = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);

      await expect(service.getEmail(userId)).resolves.toBeNull();

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        "Account email lookup failed: HttpClientError code=ECONNRESET status=502",
      );
      expect(log).not.toHaveBeenCalled();
      expect(errorLog).not.toHaveBeenCalled();
      const logged = warn.mock.calls.map((c) => JSON.stringify(c)).join("\n");
      expect(logged).not.toContain(sampleEmail);
      expect(logged).not.toContain(userId);
    });

    it("omits empty code strings and non-numeric status values from error logs", async () => {
      const err = Object.assign(new Error("boom"), { code: "", status: "502" });
      vi.spyOn(identityAdapter, "getUserEmail").mockRejectedValueOnce(err);
      const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);

      await expect(service.getEmail("user-123")).resolves.toBeNull();

      expect(warn).toHaveBeenCalledWith("Account email lookup failed: Error");
    });

    it("never leaks a non-Error thrown string containing the sample address", async () => {
      const sampleEmail = ["secret.person", "example.com"].join("@");
      vi.spyOn(identityAdapter, "getUserEmail").mockRejectedValueOnce(
        `raw failure for ${sampleEmail}`,
      );
      const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);

      await expect(service.getEmail("user_01SECRETID")).resolves.toBeNull();

      expect(warn).toHaveBeenCalledWith("Account email lookup failed: string");
      const logged = warn.mock.calls.map((c) => JSON.stringify(c)).join("\n");
      expect(logged).not.toContain(sampleEmail);
      expect(logged).not.toContain("user_01SECRETID");
    });

    it("returns null on timeout using fake timers and logs TimeoutError without leaking PII", async () => {
      vi.useFakeTimers();
      const sampleEmail = ["slow.person", "example.com"].join("@");
      const userId = "user_01TIMEOUTID";
      let rejectLate!: (reason: unknown) => void;
      vi.spyOn(identityAdapter, "getUserEmail").mockImplementationOnce(
        () =>
          new Promise<string | null>((_resolve, reject) => {
            rejectLate = reject;
          }),
      );
      const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);

      let settled = false;
      const promise = service.getEmail(userId).then((res) => {
        settled = true;
        return res;
      });

      await vi.advanceTimersByTimeAsync(EMAIL_LOOKUP_TIMEOUT_MS - 1);
      expect(settled).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      expect(settled).toBe(true);
      await expect(promise).resolves.toBeNull();

      vi.useRealTimers();
      const onUnhandled = vi.fn();
      process.on("unhandledRejection", onUnhandled);
      try {
        // Late rejection after timeout must be caught cleanly.
        rejectLate(new Error(`late failure ${sampleEmail}`));
        await new Promise((resolve) => setImmediate(resolve));
        expect(onUnhandled).not.toHaveBeenCalled();
      } finally {
        process.off("unhandledRejection", onUnhandled);
      }

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith("Account email lookup failed: TimeoutError");
      const logged = warn.mock.calls.map((c) => JSON.stringify(c)).join("\n");
      expect(logged).not.toContain(sampleEmail);
      expect(logged).not.toContain(userId);
    });
  });
});
