import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccountIntakeService } from "./account-intake.service";
import { AgentAuditService } from "./agent/agent-audit.service";
import { AgentDataService } from "./agent/agent-data.service";
import { McpImportsAdapter } from "./agent/mcp-imports.adapter";
import { McpTokenService } from "./agent/mcp-token.service";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { LastActiveInterceptor } from "./audit/last-active.interceptor";
import { AuthModule } from "./auth/auth.module";
import { ERASED_ACCOUNT_CHECK } from "./auth/erased-account";
import { BudgetController } from "./budget.controller";
import { AppConfigModule, BOOT_CONFIG } from "./config/config.module";
import { ENTITIES, typeOrmOptionsFromEnv } from "./config/typeorm.options";
import { ContractShadowInterceptor } from "./contract/contract-shadow.interceptor";
import { DeprecationInterceptor } from "./contract/deprecation.interceptor";
import { IdempotencyInterceptor } from "./contract/idempotency.interceptor";
import { FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";
import { HealthController } from "./health/health.controller";
import { USER_IDENTITY_ADAPTER, WorkOSIdentityAdapter } from "./identity/identity.adapter";
import { ImportsController } from "./imports/imports.controller";
import { ImportsService } from "./imports/imports.service";
import { McpController } from "./mcp.controller";
import { McpService } from "./mcp.service";
import { ObservabilityModule } from "./observability/observability.module";
import { slowQueryOptions } from "./observability/slow-query.logger";
import { AccountDeletionService } from "./privacy/account-deletion.service";
import { AccountExportService } from "./privacy/account-export.service";
import { BANK_CONSENT_REVOKER, ProviderBankConsentRevoker } from "./privacy/bank-consent-revoker";
import { MonzoProvider } from "./providers/monzo.provider";
import { BankProviderRegistry } from "./providers/provider.registry";
import { StarlingProvider } from "./providers/starling.provider";
import { Trading212Provider } from "./providers/trading212.provider";
import { SecurityModule } from "./security/security.module";
import { SnapshotsController } from "./snapshots/snapshots.controller";
import { SnapshotsService } from "./snapshots/snapshots.service";
import { TaxController } from "./tax.controller";
import { TaxService } from "./tax.service";
import { UserProfileController } from "./user-profile.controller";
import { UserProfileService } from "./user-profile.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    AppConfigModule,
    SecurityModule,
    ObservabilityModule,
    TypeOrmModule.forRootAsync({
      // Injecting BOOT_CONFIG makes boot validation run before any connection attempt.
      inject: [BOOT_CONFIG],
      // Slow-query log (M15) merged here so typeorm.options.ts stays the CLI's single source.
      useFactory: () => ({
        ...typeOrmOptionsFromEnv(process.env),
        ...slowQueryOptions(process.env),
      }),
    }),
    TypeOrmModule.forFeature(ENTITIES),
  ],
  controllers: [
    AppController,
    HealthController,
    FinanceController,
    UserProfileController,
    BudgetController,
    TaxController,
    SnapshotsController,
    ImportsController,
    McpController,
  ],
  providers: [
    AppService,
    AccountIntakeService,
    FinanceService,
    SnapshotsService,
    ImportsService,
    AgentAuditService,
    McpImportsAdapter,
    UserProfileService,
    AccountDeletionService,
    // The AuthGuard refuses tokens of erased accounts through this port (BE-04).
    { provide: ERASED_ACCOUNT_CHECK, useExisting: AccountDeletionService },
    AccountExportService,
    // Revokes consent at each bank before deletion or reset (BE-12, audit H10).
    { provide: BANK_CONSENT_REVOKER, useClass: ProviderBankConsentRevoker },
    TaxService,
    McpTokenService,
    AgentDataService,
    McpService,
    MonzoProvider,
    StarlingProvider,
    Trading212Provider,
    BankProviderRegistry,
    { provide: APP_INTERCEPTOR, useClass: DeprecationInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ContractShadowInterceptor },
    // After the contract interceptor, so the key's hash is over the parsed request body.
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
    // BE-06: last_active_at for the 24-month inactive-account rule (D4).
    { provide: APP_INTERCEPTOR, useClass: LastActiveInterceptor },
    {
      provide: USER_IDENTITY_ADAPTER,
      useClass: WorkOSIdentityAdapter,
    },
  ],
})
export class AppModule {}
