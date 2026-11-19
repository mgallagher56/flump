import type { RawAccountDetail } from "@flump/finance-engine";
import { Button, EmptyState, PageBody, PageHeader } from "@repo/ui";
import { type FC, type MouseEvent, useEffect, useMemo, useState } from "react";
import { useLoaderData, useSearchParams } from "react-router";
import AddEditAccountsDialogBtn from "~/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog";
import { buildAccountRows } from "~/features/accounts/accountRows";
import { AccountsGroupList } from "~/features/accounts/components/AccountsGroupList";
import { type MortgageLike, propertyPrefillFor } from "~/features/accounts/propertyPrefill";
import { CheckInSheet, firstShownElement } from "~/features/snapshot/components/CheckInSheet";
import { londonMonth } from "~/features/snapshot/snapshotModel";
import { useSaveSnapshot } from "~/features/snapshot/useSaveSnapshot";
import type { loader } from "~/routes/app.accounts._index";
import { emptyWrap, headerActions, phoneOnly, wideOnly } from "./AccountsContainer.styles";

const ADD_HREF = "/app/accounts?add=1";
const CHECK_IN_HREF = "/app/accounts?checkIn=1";
// Opened from "?checkIn=1", the check-in returns focus to whichever "Start monthly check-in" is shown.
const RETURN_FOCUS_TO = firstShownElement([
  "accounts-open-check-in",
  "accounts-open-check-in-phone",
]);

/**
 * The accounts list (E16 PR 5): the h1 with one primary action, then what you own, what you owe
 * and net worth once. No hero (P6) and no summary strip: the list is the summary.
 */
const AccountsContainer: FC = () => {
  const {
    accounts = [],
    accountDetails = [],
    userProfile = null,
    netWorth = null,
  } = useLoaderData<typeof loader>();
  // Before hydration the buttons are plain links (#701): "?add=1" and "?checkIn=1" open the add
  // dialog or the check-in on arrival, then the parameter is removed so a reload does not reopen.
  const [params, setParams] = useSearchParams();
  const addParam = params.get("add");
  const arrivedToAdd = addParam === "1" || addParam === "property";
  const [addPropertyMode, setAddPropertyMode] = useState(addParam === "property");
  const [openRequestKey, setOpenRequestKey] = useState(0);
  const [checkInOpen, setCheckInOpen] = useState(params.get("checkIn") === "1");
  useEffect(() => {
    if (params.get("add") === "property") {
      setAddPropertyMode(true);
      setOpenRequestKey((k) => k + 1);
    } else if (params.get("add") === "1") {
      setAddPropertyMode(false);
    }
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
  const saveSnapshot = useSaveSnapshot(accountDetails);

  // Net worth and its parts come from the one financial picture the shared loader built (E23,
  // audit slice 3), so the seeded "Home (your estimate)" Property account (D3) counts here exactly
  // as on the Dashboard, under the user's net worth choices. Nothing is rebuilt on the page. The
  // loader requires sign-in, so net worth is there whenever accounts are.

  const rows = useMemo(
    () => buildAccountRows(accounts as never[], accountDetails as never[]),
    [accounts, accountDetails],
  );

  const hasAccounts = accounts.length > 0;
  const propertyPrefill = useMemo(() => propertyPrefillFor(accounts as MortgageLike[]), [accounts]);
  const addDialogProps = addPropertyMode
    ? {
        initialName: propertyPrefill.name,
        initialType: "Property",
        initialSubtype: propertyPrefill.subtype,
        initialOwnership: propertyPrefill.ownership,
        initialSharePercent: propertyPrefill.sharePercent,
        linkMortgage: propertyPrefill.linkMortgage,
      }
    : {};

  return (
    <PageBody>
      <PageHeader
        actions={
          hasAccounts ? (
            <div className={headerActions()}>
              {/* E30 monthly check-in. From md only: a phone header holds one action. */}
              <Button asChild className={wideOnly()} variant="outline">
                <a
                  data-testid="accounts-open-check-in"
                  href={CHECK_IN_HREF}
                  id="accounts-open-check-in"
                  onClick={openCheckIn}
                >
                  Start monthly check-in
                </a>
              </Button>
              <AddEditAccountsDialogBtn
                {...addDialogProps}
                defaultOpen={arrivedToAdd}
                fallbackHref={ADD_HREF}
                openRequestKey={openRequestKey}
                variant="primary"
              />
            </div>
          ) : undefined
        }
        description="Everything you own and owe, in one place."
        // The page icon, empty or filled in; the empty state below has none, so one is in view.
        illustration="empty-accounts"
        title="Your accounts"
      />

      {hasAccounts && netWorth ? (
        <>
          <AccountsGroupList
            afterNetWorth={
              <div className={phoneOnly()}>
                <Button asChild variant="outline">
                  <a
                    data-testid="accounts-open-check-in-phone"
                    href={CHECK_IN_HREF}
                    id="accounts-open-check-in-phone"
                    onClick={openCheckIn}
                  >
                    Start monthly check-in
                  </a>
                </Button>
              </div>
            }
            leftOut={netWorth.leftOut}
            netWorth={netWorth.netWorth}
            profileHomeValue={
              (userProfile as { homeValue?: number | string | null } | null)?.homeValue != null
                ? Number((userProfile as { homeValue?: number | string | null }).homeValue)
                : null
            }
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
            returnFocusTo={RETURN_FOCUS_TO}
          />
        </>
      ) : (
        <div className={emptyWrap()}>
          <EmptyState
            action={
              <AddEditAccountsDialogBtn
                {...addDialogProps}
                defaultOpen={arrivedToAdd}
                fallbackHref={ADD_HREF}
                openRequestKey={openRequestKey}
                variant="primary"
              />
            }
            description="Add a current account, savings or pension and your totals will appear here."
            headingLevel="h2"
            title="No accounts yet"
          />
        </div>
      )}
      {/* Bank sync is deferred (owner ruling), so no bank connection surface shows here. */}
    </PageBody>
  );
};

export default AccountsContainer;
