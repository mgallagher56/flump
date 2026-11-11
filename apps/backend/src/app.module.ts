import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccountIntakeService } from "./account-intake.service";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { BudgetController } from "./budget.controller";
import { AppConfigModule, BOOT_CONFIG } from "./config/config.module";
import { ENTITIES, typeOrmOptionsFromEnv } from "./config/typeorm.options";
import { FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";
import { USER_IDENTITY_ADAPTER, WorkOSIdentityAdapter } from "./identity/identity.adapter";
import { McpController } from "./mcp.controller";
import { McpService } from "./mcp.service";
import { MonzoProvider } from "./providers/monzo.provider";
import { BankProviderRegistry } from "./providers/provider.registry";
import { StarlingProvider } from "./providers/starling.provider";
import { Trading212Provider } from "./providers/trading212.provider";
import { TaxController } from "./tax.controller";
import { UserProfileController } from "./user-profile.controller";
import { UserProfileService } from "./user-profile.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      // Injecting BOOT_CONFIG makes boot validation run before any connection attempt.
      inject: [BOOT_CONFIG],
      useFactory: () => typeOrmOptionsFromEnv(process.env),
    }),
    TypeOrmModule.forFeature(ENTITIES),
  ],
  controllers: [
    AppController,
    FinanceController,
    UserProfileController,
    BudgetController,
    TaxController,
    McpController,
  ],
  providers: [
    AppService,
    AccountIntakeService,
    FinanceService,
    UserProfileService,
    McpService,
    MonzoProvider,
    StarlingProvider,
    Trading212Provider,
    BankProviderRegistry,
    {
      provide: USER_IDENTITY_ADAPTER,
      useClass: WorkOSIdentityAdapter,
    },
  ],
})
export class AppModule {}
