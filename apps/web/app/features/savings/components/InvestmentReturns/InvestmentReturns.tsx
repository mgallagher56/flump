import { type FC, useMemo } from "react";
import RecordedReturn, {
  RECORDED_RETURN_HEADING,
  recordedReturnBalances,
} from "~/components/accounts/RecordedReturn";
import { returnsGrid, returnsHeading, returnsRoot } from "./InvestmentReturns.styles";

export interface InvestmentReturnsAccount {
  /** Accounts without an id (not yet saved) are left out. */
  id?: string;
  name?: string | null;
  type?: string | null;
  /** For an investment account, the user's own "Estimated annual return" (5 means 5%). */
  interestRate?: number | string | null;
  monthlyContribution?: number | string | null;
}

export interface InvestmentReturnsDetail {
  accountId?: string;
  account_id?: string;
  month?: unknown;
  year?: unknown;
  value?: unknown;
}

export interface InvestmentReturnsProps {
  accounts: readonly InvestmentReturnsAccount[];
  /** Every account's monthly balance rows, as the savings loader returns them. */
  accountDetails: readonly InvestmentReturnsDetail[];
}

const numberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * The savings page's estimated returns (owner item 10b): for each investment account (Stocks and
 * Shares ISAs and general investment accounts, which have no fixed rate), the return worked out
 * from its recorded monthly balances, per year and overall. Renders nothing without an investment
 * account.
 */
export const InvestmentReturns: FC<InvestmentReturnsProps> = ({ accounts, accountDetails }) => {
  const investments = useMemo(
    () =>
      accounts
        .filter(
          (a): a is InvestmentReturnsAccount & { id: string } =>
            a.type === "Investment" && Boolean(a.id),
        )
        .map((a) => ({
          id: a.id,
          name: a.name || "Investment account",
          assumed: numberOrNull(a.interestRate),
          monthly: numberOrNull(a.monthlyContribution),
          balances: recordedReturnBalances(
            accountDetails.filter((d) => String(d.accountId ?? d.account_id ?? "") === a.id),
          ),
        })),
    [accounts, accountDetails],
  );

  if (investments.length === 0) return null;

  return (
    <section
      aria-labelledby="investment-returns-heading"
      className={returnsRoot()}
      data-testid="investment-returns"
      id="investment-returns"
    >
      <h2 className={returnsHeading()} id="investment-returns-heading">
        {RECORDED_RETURN_HEADING}
      </h2>
      <div className={returnsGrid()}>
        {investments.map((inv) => (
          <RecordedReturn
            assumedAnnualReturn={inv.assumed}
            balances={inv.balances}
            heading={inv.name}
            headingLevel="h3"
            id={`investment-return-${inv.id}`}
            key={inv.id}
            monthlyContribution={inv.monthly}
          />
        ))}
      </div>
    </section>
  );
};

export default InvestmentReturns;
