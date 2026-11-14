import { HeroFigure, Icon, PageBody, PageHeader } from "@repo/ui";
import { ArrowLeft } from "lucide-react";
import { type FC, useMemo } from "react";
import { Link, useLoaderData } from "react-router";
import AccountDetails from "~/components/accounts/AccountDetails";
import AddEditAccountsDialogBtn from "~/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog";
import { type AccountType, isLiabilityType } from "~/containers/accounts/utils";
import { lastUpdatedLabel, summariseAccountBalance } from "~/features/accounts/accountRows";
import { TYPE_LABEL } from "~/features/accounts/components/AccountsGroupList";
import type { loader } from "~/routes/app.accounts.$account";
import { backLink, notFound } from "./AccountDetailContainer.styles";

const percent = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

/**
 * "Up 4% on October 2026", "Down 12% on last month", "No change on last month" or "No earlier
 * month". `against` names the month compared with; it defaults to "last month". The direction is in the words, never only in an arrow or colour (copy guide 3.3, 4.2).
 */
export const changeLine = (change: number | null, against?: string | null): string => {
  const on = against ?? "last month";
  if (change === null) return "No earlier month";
  if (change === 0) return `No change on ${on}`;
  return `${change > 0 ? "Up" : "Down"} ${percent.format(Math.abs(change))}% on ${on}`;
};

const BackLink: FC = () => (
  <Link className={backLink()} to="/app/accounts">
    <Icon icon={ArrowLeft} size="sm" />
    Back to accounts
  </Link>
);

const AccountDetailContainer: FC = () => {
  const { account, accountDetails = [] } = useLoaderData<typeof loader>();

  // The hero shows the saved balance, the same figure as the accounts list and net worth (D22).
  const summary = useMemo(
    // The loader returns this account's recorded months only.
    () =>
      summariseAccountBalance(account ?? {}, (accountDetails ?? []) as never[], new Date(), true),
    [account, accountDetails],
  );
  const current = summary.balance ?? 0;
  const lastUpdated = lastUpdatedLabel(accountDetails as never[]);
  // When this month is not recorded, say which month the history last has (R2-5), not a change.
  const now = new Date();
  const currentSource = (
    accountDetails as { month?: number; year?: number; source?: string }[]
  ).find(
    (d) => Number(d.month) === now.getMonth() + 1 && Number(d.year) === now.getFullYear(),
  )?.source;
  // A calculated figure says so wherever it appears (R2-5 check-in).
  const subline = summary.currentRecorded
    ? currentSource === "calculated"
      ? `Calculated for ${summary.currentLabel}`
      : changeLine(summary.changePercent, summary.againstLabel)
    : lastUpdated
      ? `Last updated ${lastUpdated}`
      : "No monthly balances recorded yet";

  if (!account) {
    return (
      <PageBody>
        <BackLink />
        <p className={notFound()}>We cannot find that account.</p>
      </PageBody>
    );
  }

  const isLiability = isLiabilityType(account.type);
  const typeLabel = TYPE_LABEL[String(account.type ?? "")] ?? account.type ?? "Account";

  return (
    <PageBody>
      <BackLink />

      {/* One action, Edit, which holds the account's saved name, type and balance (R2-5). */}
      <PageHeader
        actions={
          <AddEditAccountsDialogBtn
            account={{
              id: String(account.id ?? ""),
              name: account.name ?? "",
              type: account.type as AccountType | undefined,
              balance:
                account.balance === undefined || account.balance === null
                  ? undefined
                  : Number(account.balance),
              studentLoanPlan: account.studentLoanPlan ?? null,
            }}
            accountId={String(account.id ?? "")}
            isEditAccount
          />
        }
        description={typeLabel}
        title={account.name ?? "Account"}
      />

      <HeroFigure
        label={isLiability ? "Amount owed" : "Current balance"}
        subline={subline}
        value={current}
      />

      <AccountDetails />
    </PageBody>
  );
};

export default AccountDetailContainer;
