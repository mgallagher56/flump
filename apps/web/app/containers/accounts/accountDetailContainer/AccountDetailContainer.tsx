import { Icon, KpiCard, PageHeader } from "@repo/ui";
import { ArrowLeft } from "lucide-react";
import { type FC, useMemo } from "react";
import { Link, useLoaderData } from "react-router";
import AccountDetails from "~/components/accounts/AccountDetails";
import { isLiabilityType, toDisplayBalance } from "~/containers/accounts/utils";
import { lastUpdatedLabel } from "~/features/accounts/accountRows";
import { AccountYourDetails } from "~/features/accounts/components/AccountYourDetails";
import type { loader } from "~/routes/app.accounts.$account";
import { isFutureMonth } from "~/utils/accounts";
import { backLink, notFound, pageRoot } from "./AccountDetailContainer.styles";

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
    // Liabilities are stored as minus the amount owed; show the amount owed.
    const current = toDisplayBalance(account?.type, Number(latest.value));
    const prevBalance = prev ? toDisplayBalance(account?.type, Number(prev.value)) : undefined;
    const percent =
      prevBalance !== undefined && prevBalance !== 0
        ? Math.round(((current - prevBalance) / prevBalance) * 100)
        : null;
    return { current, change: percent };
  }, [account, accountDetails]);

  if (!account) {
    return (
      <div className={pageRoot()}>
        <p className={notFound()}>Account not found.</p>
      </div>
    );
  }

  const isLiability = isLiabilityType(account.type);
  const change = balanceStats.change;
  const delta =
    change === null
      ? undefined
      : {
          direction:
            change > 0 ? ("up" as const) : change < 0 ? ("down" as const) : ("flat" as const),
          text:
            change === 0
              ? "No change on last month"
              : `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(Math.abs(change))}% on last month`,
          polarity: isLiability ? ("liability" as const) : ("asset" as const),
        };

  return (
    <div className={pageRoot()}>
      <Link className={backLink()} to="/app/accounts">
        <Icon icon={ArrowLeft} size="sm" />
        Back to accounts
      </Link>

      <PageHeader
        subtitle={`${account.type ?? "Account"} account. Your balance history, month by month.`}
        title={account.name ?? "Account"}
      />

      <KpiCard
        delta={delta}
        label={isLiability ? "Amount owed" : "Current balance"}
        subtext="Latest balance you recorded"
        tone="hero"
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
    </div>
  );
};

export default AccountDetailContainer;
