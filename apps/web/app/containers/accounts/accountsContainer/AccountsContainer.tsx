import { PortfolioSnapshot, type RawAccount, type RawAccountDetail } from "@flump/finance-engine";
import { Button, Card, EmptyState, Illustration, PageHeader } from "@repo/ui";
import { type FC, useMemo, useState } from "react";
import { Link, useLoaderData } from "react-router";
import BankConnectionsList from "~/components/accounts/BankConnectionsList";
import AddEditAccountsDialogBtn from "~/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog";
import { AccountTypeEnum } from "~/containers/accounts/utils";
import { buildAccountRows } from "~/features/accounts/accountRows";
import { AccountsGroupList } from "~/features/accounts/components/AccountsGroupList";
import { AccountsSummary } from "~/features/accounts/components/AccountsSummary";
import { AnnualAllowancePill } from "~/features/savings/components/AnnualAllowancePill";
import { CheckInSheet } from "~/features/snapshot/components/CheckInSheet";
import { HISTORY_ROUTE } from "~/features/snapshot/components/MonthlyCheckInCard";
import { londonMonth } from "~/features/snapshot/snapshotModel";
import { useSaveSnapshot } from "~/features/snapshot/useSaveSnapshot";
import type { loader } from "~/routes/app.accounts._index";
import { isFutureMonth } from "~/utils/accounts";
import { buildWorkspacePicture } from "~/utils/financialPicture";
import { headerActions, pageRoot, section, sectionTitle } from "./AccountsContainer.styles";

const { INVESTMENT } = AccountTypeEnum;

const AccountsContainer: FC = () => {
  const {
    accounts = [],
    accountDetails = [],
    bankConnections = [],
    bankConnectionsEnabled = false,
    psaTaxBand = null,
    userProfile = null,
  } = useLoaderData<typeof loader>();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const saveSnapshot = useSaveSnapshot();

  // Totals come from the finance engine so Property, Student Loan and Overdraft are classified
  // in one place (D-5-B: a student loan is never in net worth or liabilities).
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
  // snapshot, so the seeded home Property account (D3) counts here exactly as on the dashboard.
  const netWorth = useMemo(
    () => buildWorkspacePicture({ userProfile, accounts }, { snapshot }).netWorth,
    [userProfile, accounts, snapshot],
  );

  const stats = useMemo(() => {
    let weightedYieldSum = 0;
    let yieldingCashSum = 0;
    let isaUsed = 0;

    for (const acc of snapshot.getResolvedAccounts()) {
      if (!acc.isAsset) continue;
      const balance = acc.nominalBalance;
      const isLiquid = acc.category === "cash" || acc.category === "savings";
      if (isLiquid && acc.interestRate > 0 && balance > 0) {
        weightedYieldSum += balance * acc.interestRate;
        yieldingCashSum += balance;
      }
      if (acc.name.toLowerCase().includes("isa") || acc.category === "investments") {
        isaUsed += balance;
      }
    }

    return {
      assets: netWorth.totalAssets,
      liabilities: netWorth.totalLiabilities,
      netWorth: netWorth.netWorth,
      homeEstimate: netWorth.homeEstimate,
      studentLoans: netWorth.studentLoans,
      liquidCash: netWorth.liquidCash,
      weightedAvgApy:
        yieldingCashSum > 0 ? Math.round((weightedYieldSum / yieldingCashSum) * 100) / 100 : 0,
      isaUsed: Math.min(20000, isaUsed),
    };
  }, [snapshot, netWorth]);

  // Asset allocation: assets only (Property included, Student Loan excluded).
  const allocation = useMemo(() => {
    const typeTotals: Record<string, number> = {};
    let totalAssets = 0;
    for (const acc of snapshot.getResolvedAccounts()) {
      if (!acc.isAsset || acc.nominalBalance <= 0) continue;
      totalAssets += acc.nominalBalance;
      typeTotals[acc.rawType] = (typeTotals[acc.rawType] || 0) + acc.nominalBalance;
    }
    return Object.entries(typeTotals).map(([type, value]) => ({
      type,
      value,
      percentage: totalAssets > 0 ? (value / totalAssets) * 100 : 0,
    }));
  }, [snapshot, netWorth]);

  const rows = useMemo(
    () => buildAccountRows(accounts as never[], accountDetails as never[]),
    [accounts, accountDetails],
  );

  return (
    <div className={pageRoot()}>
      <PageHeader
        actions={
          <div className={headerActions()}>
            {/* E30 monthly check-in: replaces the legacy MonthlyBalanceCheckInDrawer. */}
            <Button asChild variant="ghost">
              <Link to={HISTORY_ROUTE}>View history</Link>
            </Button>
            <Button
              data-testid="accounts-open-check-in"
              disabled={accounts.length === 0}
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
              currentMonth={londonMonth()}
              onOpenChange={setCheckInOpen}
              onSave={saveSnapshot}
              open={checkInOpen}
            />
            <AddEditAccountsDialogBtn />
          </div>
        }
        subtitle="Everything you own and owe, in one place."
        title="Your accounts"
      />

      {accounts.length > 0 ? (
        <>
          <AccountsSummary accountCount={accounts.length} allocation={allocation} stats={stats} />

          <section aria-labelledby="accounts-list-heading" className={section()}>
            <h2 className={sectionTitle()} id="accounts-list-heading">
              By type
            </h2>
            <AccountsGroupList rows={rows} />
          </section>

          <section aria-labelledby="accounts-allowance-heading" className={section()}>
            <h2 className={sectionTitle()} id="accounts-allowance-heading">
              ISA allowance
            </h2>
            <AnnualAllowancePill
              contributingAccounts={accounts
                .filter((acc) => acc.name?.toLowerCase().includes("isa") || acc.type === INVESTMENT)
                .map((acc) => ({ name: acc.name, balance: Number(acc.balance) || 0 }))}
              currentAmount={stats.isaUsed}
              taxBand={psaTaxBand ?? undefined}
              totalLimit={20000}
              type="isa"
            />
          </section>
        </>
      ) : (
        <Card padding="none">
          <EmptyState
            action={<AddEditAccountsDialogBtn />}
            description="Add an account to see your net worth and where your money sits."
            headingLevel="h2"
            illustration={<Illustration scene="onboarding" />}
            title="No accounts yet"
          />
        </Card>
      )}

      <BankConnectionsList connections={bankConnections} canConnect={bankConnectionsEnabled} />
    </div>
  );
};

export default AccountsContainer;
