import { PortfolioSnapshot, type RawAccount, type RawAccountDetail } from "@flump/finance-engine";
import { Button, EmptyState, Illustration, PageBody, PageHeader } from "@repo/ui";
import { type FC, useMemo, useState } from "react";
import { Link, useLoaderData } from "react-router";
import BankConnectionsList from "~/components/accounts/BankConnectionsList";
import AddEditAccountsDialogBtn from "~/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog";
import { buildAccountRows } from "~/features/accounts/accountRows";
import { AccountsGroupList } from "~/features/accounts/components/AccountsGroupList";
import { CheckInSheet } from "~/features/snapshot/components/CheckInSheet";
import { HISTORY_ROUTE } from "~/features/snapshot/components/MonthlyCheckInCard";
import { londonMonth } from "~/features/snapshot/snapshotModel";
import { useSaveSnapshot } from "~/features/snapshot/useSaveSnapshot";
import type { loader } from "~/routes/app.accounts._index";
import { isFutureMonth } from "~/utils/accounts";
import { buildWorkspacePicture } from "~/utils/financialPicture";
import { emptyWrap, headerActions } from "./AccountsContainer.styles";

/**
 * The accounts list (E16 PR 5): the h1 with one primary action, then what you own, what you owe
 * and net worth once. No hero (P6) and no summary strip: the list is the summary.
 */
const AccountsContainer: FC = () => {
  const {
    accounts = [],
    accountDetails = [],
    bankConnections = [],
    bankConnectionsEnabled = false,
    userProfile = null,
  } = useLoaderData<typeof loader>();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const saveSnapshot = useSaveSnapshot();

  // Totals come from the finance engine so Property, Student Loan and Overdraft are classified
  // in one place, under the user's net worth choices (saved on their profile).
  const snapshot = useMemo(
    () =>
      new PortfolioSnapshot(
        accounts as RawAccount[],
        (accountDetails as RawAccountDetail[]).filter(
          (detail) => !isFutureMonth(detail.month, detail.year),
        ),
      ),
    [accounts, accountDetails],
  );

  // Net worth and its parts come from the one financial picture (E23), built on the same
  // snapshot, so the seeded "Home (your estimate)" Property account (D3) counts here exactly as
  // on the dashboard.
  const netWorth = useMemo(
    () => buildWorkspacePicture({ userProfile, accounts }, { snapshot }).netWorth,
    [userProfile, accounts, snapshot],
  );

  const rows = useMemo(
    () => buildAccountRows(accounts as never[], accountDetails as never[]),
    [accounts, accountDetails],
  );

  const hasAccounts = accounts.length > 0;

  return (
    <PageBody>
      <PageHeader
        actions={
          hasAccounts ? (
            <div className={headerActions()}>
              <Button asChild variant="ghost">
                <Link to={HISTORY_ROUTE}>View history</Link>
              </Button>
              {/* E30 monthly check-in. */}
              <Button
                data-testid="accounts-open-check-in"
                id="accounts-open-check-in"
                onClick={() => setCheckInOpen(true)}
                type="button"
                variant="secondary"
              >
                Update balances
              </Button>
              <CheckInSheet
                accountDetails={accountDetails as RawAccountDetail[]}
                accounts={accounts}
                basis={netWorth.basis}
                currentMonth={londonMonth()}
                onOpenChange={setCheckInOpen}
                onSave={saveSnapshot}
                open={checkInOpen}
              />
              <AddEditAccountsDialogBtn variant="primary" />
            </div>
          ) : undefined
        }
        description="Everything you own and owe, in one place."
        title="Your accounts"
      />

      {hasAccounts ? (
        <AccountsGroupList
          leftOut={netWorth.leftOut}
          netWorth={netWorth.netWorth}
          rows={rows}
          totalOwe={netWorth.totalLiabilities}
          totalOwn={netWorth.totalAssets}
        />
      ) : (
        <div className={emptyWrap()}>
          <EmptyState
            action={<AddEditAccountsDialogBtn variant="primary" />}
            description="Add a current account, savings or pension and your totals will appear here."
            headingLevel="h2"
            illustration={<Illustration scene="empty-accounts" />}
            title="No accounts yet"
          />
        </div>
      )}

      {/* D8: bank connections show only for owner-allowlisted accounts (E19 D3-B capability). */}
      {bankConnectionsEnabled ? (
        <BankConnectionsList canConnect connections={bankConnections} />
      ) : null}
    </PageBody>
  );
};

export default AccountsContainer;
