import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccountIntakeService } from "./account-intake.service";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { BudgetController } from "./budget.controller";
import { Account } from "./entities/account.entity";
import { AccountDetail } from "./entities/account-detail.entity";
import { BankConnection } from "./entities/bank-connection.entity";
import { BudgetEntry } from "./entities/budget-entry.entity";
import { McpToken } from "./entities/mcp-token.entity";
import { TaxRecord } from "./entities/tax-record.entity";
import { Transaction } from "./entities/transaction.entity";
import { UserProfile } from "./entities/user-profile.entity";
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
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>("DATABASE_URL");
        if (url) {
          const isLocal =
            url.includes("localhost") ||
            url.includes("127.0.0.1") ||
            configService.get<string>("DB_SSL") === "false";
          return {
            type: "postgres",
            url,
            entities: [
              Account,
              Transaction,
              AccountDetail,
              BankConnection,
              UserProfile,
              BudgetEntry,
              TaxRecord,
              McpToken,
            ],
            synchronize: true,
            ssl: isLocal ? false : { rejectUnauthorized: false },
          };
        }
        return {
          type: "postgres",
          host: configService.get<string>("DB_HOST", "localhost"),
          port: configService.get<number>("DB_PORT", 5432),
          username: configService.get<string>("DB_USER", "postgres"),
          password: configService.get<string>("DB_PASSWORD", "postgres"),
          database: configService.get<string>("DB_NAME", "postgres"),
          entities: [
            Account,
            Transaction,
            AccountDetail,
            BankConnection,
            UserProfile,
            BudgetEntry,
            TaxRecord,
            McpToken,
          ],
          synchronize: true,
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      Account,
      Transaction,
      AccountDetail,
      BankConnection,
      UserProfile,
      BudgetEntry,
      TaxRecord,
      McpToken,
    ]),
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
