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

    const result = await service.resetFinancialData("user-123", "user@flump.co.uk");

    expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    expect(mockAccountRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });
    expect(mockTransactionRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });
    expect(mockBankConnectionRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });
    expect(mockBudgetEntryRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });
    expect(mockTaxRecordRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });
    expect(mockAccountDetailRepo.delete).toHaveBeenCalled();

    expect(result.success).toBe(true);
    expect(result.profile.hasResetFinancialData).toBe(true);
    expect(result.profile.annualSalary).toBeNull();
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

  it("delegates password updates and validation to the UserIdentityAdapter", async () => {
    await service.updatePassword("user-123", "new-secure-password");

    expect(identityAdapter.updatedPasswords).toEqual([
      { userId: "user-123", newPassword: "new-secure-password" },
    ]);
  });

  it("delegates password reset requests to the UserIdentityAdapter", async () => {
    await service.sendPasswordReset("test@flump.co.uk");

    expect(identityAdapter.resetEmails).toEqual(["test@flump.co.uk"]);
  });
});
