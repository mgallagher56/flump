import { PortfolioSnapshot, type RawAccount, type RawAccountDetail } from "@flump/finance-engine";
import { Button, EmptyState, Illustration, PageBody, PageHeader } from "@repo/ui";
import { type FC, type MouseEvent, useEffect, useMemo, useState } from "react";
import { useLoaderData, useSearchParams } from "react-router";
import AddEditAccountsDialogBtn from "~/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog";
import { buildAccountRows } from "~/features/accounts/accountRows";
import { AccountsGroupList } from "~/features/accounts/components/AccountsGroupList";
import { CheckInSheet } from "~/features/snapshot/components/CheckInSheet";
import { londonMonth } from "~/features/snapshot/snapshotModel";
import { useSaveSnapshot } from "~/features/snapshot/useSaveSnapshot";
import type { loader } from "~/routes/app.accounts._index";
import { isFutureMonth } from "~/utils/accounts";
import { buildWorkspacePicture } from "~/utils/financialPicture";
import { emptyWrap, headerActions, phoneOnly, wideOnly } from "./AccountsContainer.styles";

const ADD_HREF = "/app/accounts?add=1";
const CHECK_IN_HREF = "/app/accounts?checkIn=1";

/**
 * The accounts list (E16 PR 5): the h1 with one primary action, then what you own, what you owe
 * and net worth once. No hero (P6) and no summary strip: the list is the summary.
 */
const AccountsContainer: FC = () => {
  const { accounts = [], accountDetails = [], userProfile = null } = useLoaderData<typeof loader>();
  // Before hydration the buttons are plain links (#701): "?add=1" and "?checkIn=1" open the add
  // dialog or the check-in on arrival, then the parameter is removed so a reload does not reopen.
  const [params, setParams] = useSearchParams();
  const arrivedToAdd = params.get("add") === "1";
  const [checkInOpen, setCheckInOpen] = useState(params.get("checkIn") === "1");
  useEffect(() => {
    if (params.has("add") || params.has("checkIn")) {
      const next = new URLSearchParams(params);
      next.delete("add");
      next.delete("checkIn");
      setParams(next, { replace: true, preventScrollReset: true });
    }
  }, [params, setParams]);
  const openCheckIn = (e: MouseEvent) => {
    e.preventDefault();
    setCheckInOpen(true);
  };
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
              {/* E30 monthly check-in. From md only: a phone header holds one action. */}
              <Button asChild className={wideOnly()} variant="secondary">
                <a
                  data-testid="accounts-open-check-in"
                  href={CHECK_IN_HREF}
                  id="accounts-open-check-in"
                  onClick={openCheckIn}
                >
                  Update balances
                </a>
              </Button>
              <AddEditAccountsDialogBtn
                defaultOpen={arrivedToAdd}
                fallbackHref={ADD_HREF}
                variant="primary"
              />
            </div>
          ) : undefined
        }
        description="Everything you own and owe, in one place."
        title="Your accounts"
      />

      {hasAccounts ? (
        <>
          <AccountsGroupList
            afterNetWorth={
              <div className={phoneOnly()}>
                <Button asChild variant="secondary">
                  <a
                    data-testid="accounts-open-check-in-phone"
                    href={CHECK_IN_HREF}
                    id="accounts-open-check-in-phone"
                    onClick={openCheckIn}
                  >
                    Update balances
                  </a>
                </Button>
              </div>
            }
            leftOut={netWorth.leftOut}
            netWorth={netWorth.netWorth}
            rows={rows}
            totalOwe={netWorth.totalLiabilities}
            totalOwn={netWorth.totalAssets}
          />
          <CheckInSheet
            accountDetails={accountDetails as RawAccountDetail[]}
            accounts={accounts}
            basis={netWorth.basis}
            currentMonth={londonMonth()}
            onOpenChange={setCheckInOpen}
            onSave={saveSnapshot}
            open={checkInOpen}
          />
        </>
      ) : (
        <div className={emptyWrap()}>
          <EmptyState
            action={
              <AddEditAccountsDialogBtn
                defaultOpen={arrivedToAdd}
                fallbackHref={ADD_HREF}
                variant="primary"
              />
            }
            description="Add a current account, savings or pension and your totals will appear here."
            headingLevel="h2"
            illustration={<Illustration scene="empty-accounts" />}
            title="No accounts yet"
          />
        </div>
      )}
      {/* Bank sync is deferred (owner ruling), so no bank connection surface shows here. */}
    </PageBody>
  );
};

export default AccountsContainer;
