import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { BudgetController } from "./budget.controller";
import { Account } from "./entities/account.entity";
import { AccountDetail } from "./entities/account-detail.entity";
import { BankConnection } from "./entities/bank-connection.entity";
import { BudgetEntry } from "./entities/budget-entry.entity";
import { TaxRecord } from "./entities/tax-record.entity";
import { Transaction } from "./entities/transaction.entity";
import { UserProfile } from "./entities/user-profile.entity";
import { FinanceController } from "./finance.controller";
import { MonzoProvider } from "./providers/monzo.provider";
import { BankProviderRegistry } from "./providers/provider.registry";
import { StarlingProvider } from "./providers/starling.provider";
import { TaxController } from "./tax.controller";
import { UserProfileController } from "./user-profile.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>("DATABASE_URL");
        if (url) {
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
            ],
            synchronize: true,
            ssl: { rejectUnauthorized: false },
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
    ]),
  ],
  controllers: [
    AppController,
    FinanceController,
    UserProfileController,
    BudgetController,
    TaxController,
  ],
  providers: [AppService, MonzoProvider, StarlingProvider, BankProviderRegistry],
})
export class AppModule {}
