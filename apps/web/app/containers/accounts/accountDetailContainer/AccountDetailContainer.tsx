import { HeroFigure, Icon, PageBody, PageHeader } from "@repo/ui";
import { ArrowLeft } from "lucide-react";
import { type FC, useMemo } from "react";
import { Link, useLoaderData } from "react-router";
import AccountDetails from "~/components/accounts/AccountDetails";
import { isLiabilityType, toDisplayBalance } from "~/containers/accounts/utils";
import { lastUpdatedLabel } from "~/features/accounts/accountRows";
import { AccountYourDetails } from "~/features/accounts/components/AccountYourDetails";
import type { loader } from "~/routes/app.accounts.$account";
import { isFutureMonth } from "~/utils/accounts";
import { backLink, notFound } from "./AccountDetailContainer.styles";

const percent = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

/**
 * "Up 4% on last month", "Down 12% on last month", "No change on last month" or "No earlier
 * month". The direction is in the words, never only in an arrow or colour (copy guide 3.3, 4.2).
 */
export const changeLine = (change: number | null): string => {
  if (change === null) return "No earlier month";
  if (change === 0) return "No change on last month";
  return `${change > 0 ? "Up" : "Down"} ${percent.format(Math.abs(change))}% on last month`;
};

const BackLink: FC = () => (
  <Link className={backLink()} to="/app/accounts">
    <Icon icon={ArrowLeft} size="sm" />
    Back to accounts
  </Link>
);

const AccountDetailContainer: FC = () => {
  const { account, accountDetails = [] } = useLoaderData<typeof loader>();

  const balanceStats = useMemo(() => {
    const sorted = [...(accountDetails || [])]
      .filter((d: any) => !isFutureMonth(d.month, d.year))
      .sort((a: any, b: any) => (a.year !== b.year ? a.year - b.year : a.month - b.month));

    if (sorted.length === 0) {
      return { current: toDisplayBalance(account?.type, account?.balance ?? 0), change: null };
    }

    const latest = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    // What you owe is stored as minus the amount owed; show the amount owed.
    const current = toDisplayBalance(account?.type, Number(latest.value));
    const prevBalance = prev ? toDisplayBalance(account?.type, Number(prev.value)) : undefined;
    const change =
      prevBalance !== undefined && prevBalance !== 0
        ? Math.round(((current - prevBalance) / prevBalance) * 100)
        : null;
    return { current, change };
  }, [account, accountDetails]);

  if (!account) {
    return (
      <PageBody>
        <BackLink />
        <p className={notFound()}>We cannot find that account.</p>
      </PageBody>
    );
  }

  const isLiability = isLiabilityType(account.type);

  return (
    <PageBody>
      <BackLink />

      <PageHeader
        description={`${account.type ?? "Account"} account. Your balance history, month by month.`}
        title={account.name ?? "Account"}
      />

      <HeroFigure
        label={isLiability ? "Amount owed" : "Current balance"}
        subline={changeLine(balanceStats.change)}
        value={balanceStats.current}
      />

      <AccountYourDetails
        accountId={String(account.id ?? "")}
        balance={balanceStats.current}
        lastUpdated={lastUpdatedLabel(accountDetails as never[])}
        name={account.name ?? ""}
        type={String(account.type ?? "")}
      />

      <AccountDetails />
    </PageBody>
  );
};

export default AccountDetailContainer;
