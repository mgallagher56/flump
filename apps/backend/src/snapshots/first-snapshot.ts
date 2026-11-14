import { In, type Repository } from "typeorm";
import type { Account } from "../entities/account.entity";
import type { AccountDetail } from "../entities/account-detail.entity";
import { londonDate, londonYearMonth } from "./london-date";
import { storedBalance } from "./stored-balance";

/**
 * E30 D8: the first onboarding data is the first snapshot. Writes one `source=onboarding` row per
 * account for the current Europe/London month, only where the month has no row yet, so it never
 * replaces a value the user or a sync has already recorded. Returns the number of rows written.
 */
export async function writeOnboardingSnapshot(
  accountRepo: Repository<Account>,
  detailRepo: Repository<AccountDetail>,
  userId: string,
  now: Date = new Date(),
): Promise<number> {
  const accounts = await accountRepo.find({ where: { userId } });
  if (accounts.length === 0) return 0;
  const { year, month } = londonYearMonth(now);
  const existing = await detailRepo.find({
    where: { accountId: In(accounts.map((a) => a.id)), year, month },
  });
  const have = new Set(existing.map((d) => d.accountId));
  const asOfDate = londonDate(now);
  const rows = accounts
    .filter((a) => !have.has(a.id))
    .map((a) =>
      detailRepo.create({
        accountId: a.id,
        userId,
        year,
        month,
        // Already signed on write; the rule again keeps this path safe on its own (BE-05).
        value: storedBalance(a.type, Number(a.balance)),
        asOfDate,
        source: "onboarding",
      }),
    );
  if (rows.length > 0) await detailRepo.save(rows);
  return rows.length;
}
