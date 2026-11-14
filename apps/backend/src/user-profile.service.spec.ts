import { Logger, ServiceUnavailableException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryIdentityAdapter } from "./identity/identity.adapter";
import { UserProfileService } from "./user-profile.service";

describe("UserProfileService (Deep Module)", () => {
  let service: UserProfileService;
  let mockUserProfileRepo: any;
  let mockAccountRepo: any;
  let mockTransactionRepo: any;
  let mockAccountDetailRepo: any;
  let mockBankConnectionRepo: any;
  let mockBudgetEntryRepo: any;
  let mockTaxRecordRepo: any;
  let mockCheckinRepo: any;
  let mockImportRepo: any;
  let mockMcpTokenRepo: any;
  let mockBankOAuthStateRepo: any;
  let identityAdapter: InMemoryIdentityAdapter;
  let mockDataSource: any;

  beforeEach(() => {
    mockUserProfileRepo = {
      findOne: vi.fn(),
      save: vi.fn((entity) => Promise.resolve({ id: "profile-1", ...entity })),
      create: vi.fn((entity) => ({ ...entity })),
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
    identityAdapter = new InMemoryIdentityAdapter();
    mockDataSource = {
      transaction: vi.fn(async (cb) => {
        const fakeManager = {
          getRepository: (entityClass: any) => {
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
            return {};
          },
        };
        return cb(fakeManager);
      }),
    };

    service = new UserProfileService(
      mockUserProfileRepo,
      mockAccountRepo,
      mockTransactionRepo,
      mockAccountDetailRepo,
      mockBankConnectionRepo,
      mockBudgetEntryRepo,
      mockTaxRecordRepo,
      identityAdapter,
      mockDataSource,
    );
  });

  it("resets all 6 financial entity tables inside a single atomic transaction", async () => {
    mockUserProfileRepo.findOne.mockResolvedValueOnce({
      userId: "user-123",
      annualSalary: 95000,
    });

    const result = await service.resetFinancialData("user-123", "user@example.com");

    expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
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

    expect(result.success).toBe(true);
    expect(result.profile.hasResetFinancialData).toBe(true);
    expect(result.profile.annualSalary).toBeNull();
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
    const saved = mockUserProfileRepo.save.mock.calls.at(-1)[0];
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
    const withSeam = new UserProfileService(
      mockUserProfileRepo,
      mockAccountRepo,
      mockTransactionRepo,
      mockAccountDetailRepo,
      mockBankConnectionRepo,
      mockBudgetEntryRepo,
      mockTaxRecordRepo,
      identityAdapter,
      mockDataSource,
      undefined,
      undefined,
      undefined,
      { revokeAll },
    );
    mockUserProfileRepo.findOne.mockResolvedValueOnce({ userId: "user-123" });
    await withSeam.resetFinancialData("user-123");
    expect(revokeAll).toHaveBeenCalledWith("user-123", [
      { id: "c1", institutionId: "monzo", authType: "oauth" },
    ]);
    expect(revokeAll.mock.invocationCallOrder[0]).toBeLessThan(
      mockDataSource.transaction.mock.invocationCallOrder[0],
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
    const guarded = new UserProfileService(
      mockUserProfileRepo,
      mockAccountRepo,
      mockTransactionRepo,
      mockAccountDetailRepo,
      mockBankConnectionRepo,
      mockBudgetEntryRepo,
      mockTaxRecordRepo,
      identityAdapter,
      mockDataSource,
      undefined,
      undefined,
      undefined,
      undefined,
      accountDeletion as never,
    );
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
    expect((resetEvents()[0][0] as { removed: { snapshotCheckins: number } }).removed).toEqual(
      expect.objectContaining({ snapshotCheckins: 1 }),
    );
    log.mockRestore();
  });

  it("filters the retired forecast module key on read without touching the stored row", async () => {
    const stored = {
      id: "profile-1",
      userId: "user-123",
      enabledPages: ["accounts", "forecast", "tax"],
      dashboardWidgets: ["accounts", "forecast"],
      dashboardWidgetOrder: ["forecast", "accounts"],
      dashboardWidgetSizes: { accounts: "wide", forecast: "normal" },
      dashboardWidgetConfig: { forecast: { forecastYears: 20 } },
    };
    mockUserProfileRepo.findOne.mockResolvedValue(stored);

    const result = await service.getProfile("user-123");

    expect(result.enabledPages).toEqual(["accounts", "tax"]);
    expect(result.dashboardWidgets).toEqual(["accounts"]);
    expect(result.dashboardWidgetOrder).toEqual(["accounts"]);
    expect(result.dashboardWidgetSizes).toEqual({ accounts: "wide" });
    expect(result.dashboardWidgetConfig).toEqual({});
    expect(mockUserProfileRepo.save).not.toHaveBeenCalled();
    expect(stored.enabledPages).toContain("forecast");
  });

  it("falls back to default widget sizes when only the retired forecast size was stored", async () => {
    mockUserProfileRepo.findOne.mockResolvedValue({
      id: "profile-1",
      userId: "user-123",
      dashboardWidgetSizes: { forecast: "normal" },
    });
    const result = await service.getProfile("user-123");
    expect(result.dashboardWidgetSizes).toEqual({ accounts: "wide" });
  });

  describe("salary sacrifice is never assumed", () => {
    it("getProfile creates a new profile with salary sacrifice off", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue(null);

      const result = await service.getProfile("user-123");

      expect(mockUserProfileRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isSalarySacrifice: false }),
      );
      expect(result.isSalarySacrifice).toBe(false);
    });

    it("updateProfile creates a new profile with salary sacrifice off", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue(null);

      const result = await service.updateProfile("user-123", { currency: "EUR" });

      expect(mockUserProfileRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isSalarySacrifice: false }),
      );
      expect(result.isSalarySacrifice).toBe(false);
    });

    it("updateChecklist creates a new profile with salary sacrifice off", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue(null);

      await service.updateChecklist("user-123", "profile", true);

      expect(mockUserProfileRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isSalarySacrifice: false }),
      );
    });

    it("reads a stored null as off", async () => {
      mockUserProfileRepo.findOne.mockResolvedValue({
        id: "profile-1",
        userId: "user-123",
        isSalarySacrifice: null,
      });

      const result = await service.getProfile("user-123");

      expect(result.isSalarySacrifice).toBe(false);
    });
  });

  describe("lazy profile creation", () => {
    const uniqueViolation = () => Object.assign(new Error("duplicate key"), { code: "23505" });
    const wrappedViolation = () => {
      const err: any = new Error("duplicate key value violates unique constraint");
      err.name = "QueryFailedError";
      err.driverError = { code: "23505" };
      return err;
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
      let stored: any = null;
      mockUserProfileRepo.findOne.mockImplementation(async () => {
        await Promise.resolve();
        return stored;
      });
      mockUserProfileRepo.save.mockImplementation(async (entity: any) => {
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
        .mockImplementationOnce((entity: any) => Promise.resolve(entity));

      const result = await service.updateProfile("user-123", { currency: "EUR" });

      expect(result.id).toBe("profile-9");
      expect(result.currency).toBe("EUR");
    });

    it("updateChecklist recovers from a concurrent create", async () => {
      const existing = { id: "profile-9", userId: "user-123", setupChecklistCompletedSteps: [] };
      mockUserProfileRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existing);
      mockUserProfileRepo.save
        .mockRejectedValueOnce(uniqueViolation())
        .mockImplementationOnce((entity: any) => Promise.resolve(entity));

      const result = await service.updateChecklist("user-123", "profile", true);

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
    const res = await (service as any).sendPasswordReset("user-123", "victim@x");

    expect(res).toEqual({ success: true });
    expect(identityAdapter.resetEmails).toEqual(["me@example.com"]);
  });

  it("fails (503) when the user's email cannot be resolved", async () => {
    await expect(service.sendPasswordReset("nobody")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(identityAdapter.resetEmails).toEqual([]);
  });

  it("fails (503) when no identity adapter is configured", async () => {
    const bare = new UserProfileService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(bare.sendPasswordReset("user-123")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
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
});
