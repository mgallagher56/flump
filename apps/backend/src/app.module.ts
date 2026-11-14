import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { LastActiveInterceptor } from "./audit/last-active.interceptor";
import { AuthModule } from "./auth/auth.module";
import { AppConfigModule, BOOT_CONFIG } from "./config/config.module";
import { typeOrmOptionsFromEnv } from "./config/typeorm.options";
import { ContractShadowInterceptor } from "./contract/contract-shadow.interceptor";
import { DeprecationInterceptor } from "./contract/deprecation.interceptor";
import { IdempotencyInterceptor } from "./contract/idempotency.interceptor";
import { HealthController } from "./health/health.controller";
import { AgentModule } from "./modules/agent/agent.module";
import { BudgetModule } from "./modules/budget/budget.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { ImportsModule } from "./modules/imports/imports.module";
import { PrivacyModule } from "./modules/privacy/privacy.module";
import { ProfileModule } from "./modules/profile/profile.module";
import { SnapshotsModule } from "./modules/snapshots/snapshots.module";
import { TaxModule } from "./modules/tax/tax.module";
import { ObservabilityModule } from "./observability/observability.module";
import { slowQueryOptions } from "./observability/slow-query.logger";
import { SecurityModule } from "./security/security.module";

/**
 * The composition root (BE-13, audit M22): platform modules, then one module per domain under
 * src/modules. Each domain module registers its own repositories, so a missing provider fails
 * at boot. Dependency direction is enforced by scripts/backend-laws/check-module-boundaries.ts.
 */
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
    FinanceModule,
    ProfileModule,
    BudgetModule,
    TaxModule,
    SnapshotsModule,
    ImportsModule,
    AgentModule,
    PrivacyModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: DeprecationInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ContractShadowInterceptor },
    // After the contract interceptor, so the key's hash is over the parsed request body.
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
    // BE-06: last_active_at for the 24-month inactive-account rule (D4).
    { provide: APP_INTERCEPTOR, useClass: LastActiveInterceptor },
  ],
})
export class AppModule {}
