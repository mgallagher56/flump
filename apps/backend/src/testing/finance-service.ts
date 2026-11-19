import type { ConfigService } from "@nestjs/config";
import type { Repository } from "typeorm";
import type { Account } from "../entities/account.entity";
import type { AccountDetail } from "../entities/account-detail.entity";
import type { BankConnection } from "../entities/bank-connection.entity";
import type { BankProviderRegistry } from "../modules/banking/providers/provider.registry";
import { AccountIntakeService } from "../modules/finance/account-intake.service";
import { FinanceService } from "../modules/finance/finance.service";

/**
 * Test wiring (BE-13): FinanceService takes its AccountIntakeService by injection. Specs that
 * build it by hand get one over the same repositories, as Nest would wire it.
 */
export function financeServiceWithIntake(
  accounts: unknown,
  details: unknown,
  connections: unknown,
  _profiles: unknown,
  registry: unknown,
  config: unknown,
): FinanceService {
  const intake = new AccountIntakeService(
    accounts as Repository<Account>,
    details as Repository<AccountDetail>,
    connections as Repository<BankConnection>,
  );
  return new FinanceService(
    connections as Repository<BankConnection>,
    registry as BankProviderRegistry,
    config as ConfigService,
    intake,
  );
}
