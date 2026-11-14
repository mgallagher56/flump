import "reflect-metadata";
import { type Type } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../app.module";
import { AuthModule } from "../auth/auth.module";
import { ERASED_ACCOUNT_CHECK } from "../auth/erased-account";
import { TOKEN_VERIFIER } from "../auth/token-verifier";
import { typeOrmOptionsFromEnv } from "../config/typeorm.options";
import { Account } from "../entities/account.entity";
import { AccountDetail } from "../entities/account-detail.entity";
import { BankConnection } from "../entities/bank-connection.entity";
import { Transaction } from "../entities/transaction.entity";
import { UserProfile } from "../entities/user-profile.entity";
import { assertSafeTestDatabase } from "../testing/assertSafeTestDatabase";
import { resolveDbTestMode } from "../testing/dbTestMode";
import { AgentModule } from "./agent/agent.module";
import { McpController } from "./agent/mcp.controller";
import { BankingModule } from "./banking/banking.module";
import { BankProviderRegistry } from "./banking/providers/provider.registry";
import { BudgetController } from "./budget/budget.controller";
import { BudgetModule } from "./budget/budget.module";
import { BudgetService } from "./budget/budget.service";
import { FinanceController } from "./finance/finance.controller";
import { FinanceModule } from "./finance/finance.module";
import { FinanceService } from "./finance/finance.service";
import { ImportsController } from "./imports/imports.controller";
import { ImportsModule } from "./imports/imports.module";
import { AccountDeletionService } from "./privacy/account-deletion.service";
import { AccountExportService } from "./privacy/account-export.service";
import { PrivacyModule } from "./privacy/privacy.module";
import { ProfileModule } from "./profile/profile.module";
import { UserProfileController } from "./profile/user-profile.controller";
import { UserProfileService } from "./profile/user-profile.service";
import { SnapshotsController } from "./snapshots/snapshots.controller";
import { SnapshotsModule } from "./snapshots/snapshots.module";
import { TaxController } from "./tax/tax.controller";
import { TaxModule } from "./tax/tax.module";

/**
 * Module boot (BE-13, audit M19 and M22). Controllers take their services by plain injection and
 * services no longer mark dependencies optional, so a missing provider is a boot error, not a
 * runtime `undefined`. The second block boots each domain module on its own, which proves every
 * module declares its own repositories and imports instead of leaning on a sibling.
 */
describe("a missing provider fails at boot", () => {
  // Guards resolve at compile time, so the AuthGuard needs its verifier to reach the real gap.
  const verifier = { provide: TOKEN_VERIFIER, useValue: {} };

  it("TaxController without TaxService", async () => {
    await expect(
      Test.createTestingModule({ controllers: [TaxController], providers: [verifier] }).compile(),
    ).rejects.toThrow(/TaxService/);
  });

  it("BudgetController without BudgetService", async () => {
    await expect(
      Test.createTestingModule({
        controllers: [BudgetController],
        providers: [verifier],
      }).compile(),
    ).rejects.toThrow(/BudgetService/);
  });

  it("UserProfileController without AccountDeletionService", async () => {
    await expect(
      Test.createTestingModule({
        controllers: [UserProfileController],
        providers: [
          verifier,
          { provide: UserProfileService, useValue: {} },
          { provide: AccountExportService, useValue: {} },
        ],
      }).compile(),
    ).rejects.toThrow(/AccountDeletionService/);
  });

  it("FinanceService without AccountIntakeService", async () => {
    const repo = (entity: Type) => ({ provide: getRepositoryToken(entity), useValue: {} });
    await expect(
      Test.createTestingModule({
        providers: [
          FinanceService,
          repo(Account),
          repo(Transaction),
          repo(AccountDetail),
          repo(BankConnection),
          repo(UserProfile),
          { provide: BankProviderRegistry, useValue: {} },
          { provide: ConfigService, useValue: {} },
        ],
      }).compile(),
    ).rejects.toThrow(/AccountIntakeService/);
  });
});

/** Modules reachable from `root` through `imports`, dynamic modules followed through `module`. */
function reachableModules(root: unknown, seen = new Set<unknown>()): Set<unknown> {
  const moduleClass =
    root && typeof root === "object" ? (root as { module?: unknown }).module : root;
  if (typeof moduleClass !== "function" || seen.has(moduleClass)) return seen;
  seen.add(moduleClass);
  for (const imported of Reflect.getMetadata("imports", moduleClass) ?? []) {
    reachableModules(imported, seen);
  }
  return seen;
}

describe("the erased-account port stays wired (BE-04)", () => {
  // AuthGuard resolves ERASED_ACCOUNT_CHECK lazily and lets requests through when it is absent,
  // so losing the PrivacyModule import would silently switch the check off.
  it("AppModule reaches a module that provides and exports ERASED_ACCOUNT_CHECK", () => {
    const providing = [...reachableModules(AppModule)].filter((m) => {
      const providers: unknown[] = Reflect.getMetadata("providers", m as object) ?? [];
      const exportsList: unknown[] = Reflect.getMetadata("exports", m as object) ?? [];
      const provides = providers.some(
        (p) =>
          typeof p === "object" && (p as { provide?: unknown }).provide === ERASED_ACCOUNT_CHECK,
      );
      return provides && exportsList.includes(ERASED_ACCOUNT_CHECK);
    });
    expect(providing).toEqual([PrivacyModule]);
  });
});

describe.skipIf(resolveDbTestMode(process.env) === "skip")("each domain module boots alone", () => {
  const savedEnv = { ...process.env };

  beforeAll(() => {
    const databaseUrl = process.env.TEST_DATABASE_URL as string;
    assertSafeTestDatabase(databaseUrl, process.env);
    process.env.NODE_ENV = "test";
    // Real "workos" mode with a placeholder client id; the verifier is stubbed below.
    delete process.env.AUTH_DEV_BYPASS;
    process.env.WORKOS_CLIENT_ID = "client_test";
    delete process.env.RAILWAY_ENVIRONMENT;
    process.env.DATABASE_URL = databaseUrl;
    process.env.DB_SSL = "false";
    process.env.DB_SYNCHRONIZE = "false";
  });

  afterAll(() => {
    process.env = savedEnv;
  });

  const cases: [string, Type, Type[]][] = [
    ["banking", BankingModule, [BankProviderRegistry]],
    ["snapshots", SnapshotsModule, [SnapshotsController]],
    ["budget", BudgetModule, [BudgetController, BudgetService]],
    ["tax", TaxModule, [TaxController]],
    ["imports", ImportsModule, [ImportsController]],
    ["finance", FinanceModule, [FinanceController, FinanceService]],
    ["privacy", PrivacyModule, [AccountDeletionService, AccountExportService]],
    ["profile", ProfileModule, [UserProfileController, UserProfileService]],
    ["agent", AgentModule, [McpController]],
  ];

  it.each(cases)("%s", async (_name, domainModule, resolves) => {
    // Only the platform pieces every module may assume: config, auth and the database.
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        AuthModule,
        TypeOrmModule.forRoot({
          ...typeOrmOptionsFromEnv(process.env),
          // No schema work: the boot only needs a connection.
          migrations: [],
          migrationsRun: false,
          retryAttempts: 0,
        }),
        domainModule,
      ],
    })
      .overrideProvider(TOKEN_VERIFIER)
      .useValue({})
      .compile();
    try {
      for (const token of resolves) expect(moduleRef.get(token, { strict: false })).toBeDefined();
    } finally {
      await moduleRef.close();
    }
  });
});
