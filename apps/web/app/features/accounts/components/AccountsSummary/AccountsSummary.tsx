import { Card, KpiCard, KpiStrip, Money, Num, ProgressBar } from "@repo/ui";
import type { FC } from "react";
import {
  allocationItem,
  allocationList,
  section,
  sectionTitle,
  studentLoanLine,
  studentLoanNote,
  summaryRoot,
} from "./AccountsSummary.styles";

export interface AllocationSegment {
  type: string;
  value: number;
  percentage: number;
}

export interface AccountsSummaryStats {
  assets: number;
  liabilities: number;
  netWorth: number;
  studentLoans: number;
  liquidCash: number;
  weightedAvgApy: number;
}

export interface AccountsSummaryProps {
  stats: AccountsSummaryStats;
  allocation: AllocationSegment[];
  accountCount: number;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** One hero for net worth, then a single "Where you stand" strip of four figures. */
export const AccountsSummary: FC<AccountsSummaryProps> = ({ stats, allocation, accountCount }) => (
  <div className={summaryRoot()}>
    <KpiCard
      label="Net worth"
      subtext={`Across ${plural(accountCount, "account", "accounts")}, from the balances you saved`}
      tone="hero"
      value={stats.netWorth}
    />

    <section aria-labelledby="accounts-stand-heading" className={section()}>
      <h2 className={sectionTitle()} id="accounts-stand-heading">
        Where you stand
      </h2>
      <KpiStrip columns={4}>
        <KpiCard
          label="Total assets"
          subtext="Cash, savings, investments, pensions and property"
          value={stats.assets}
        />
        <KpiCard
          label="Total liabilities"
          subtext={
            stats.liabilities > 0 ? "Mortgages, cards, loans and overdrafts" : "Nothing owed"
          }
          value={stats.liabilities}
        />
        <KpiCard
          label="Cash and savings"
          subtext="Instant access and everyday money"
          value={stats.liquidCash}
        />
        <KpiCard
          label="Average interest"
          subtext="Weighted by balance (AER)"
          value={<Num fractionDigits={2} kind="percent" size="lg" value={stats.weightedAvgApy} />}
        />
      </KpiStrip>
      {stats.studentLoans > 0 && (
        <div className={studentLoanLine()} id="student-loans-line" data-testid="student-loans-line">
          <p className={studentLoanNote()}>
            Student loans (not in net worth): <Money size="sm" value={stats.studentLoans} />
          </p>
          <p className={studentLoanNote()}>
            Repayments come out of your pay as you earn, and any balance left is written off after
            the repayment term, so it is shown separately.
          </p>
        </div>
      )}
    </section>

    {allocation.length > 0 && (
      <section aria-labelledby="accounts-allocation-heading" className={section()}>
        <h2 className={sectionTitle()} id="accounts-allocation-heading">
          Where your assets sit
        </h2>
        <Card>
          <ul className={allocationList()}>
            {allocation.map((segment) => (
              <li key={segment.type} className={allocationItem()}>
                <ProgressBar
                  label={segment.type}
                  max={100}
                  size="md"
                  value={segment.percentage}
                  valueDisplay={
                    <>
                      <Money size="sm" value={segment.value} />{" "}
                      <Num
                        fractionDigits={0}
                        kind="percent"
                        size="sm"
                        tone="muted"
                        value={segment.percentage}
                      />
                    </>
                  }
                  valueText={`${segment.type}: ${Math.round(segment.percentage)}% of your assets`}
                />
              </li>
            ))}
          </ul>
        </Card>
      </section>
    )}
  </div>
);

export default AccountsSummary;
