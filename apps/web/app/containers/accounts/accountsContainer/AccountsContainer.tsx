import { PortfolioSnapshot, type RawAccount, type RawAccountDetail } from "@flump/finance-engine";
import { Card, EmptyState, Illustration, PageHeader } from "@repo/ui";
import { type FC, useMemo } from "react";
import { useLoaderData } from "react-router";
import BankConnectionsList from "~/components/accounts/BankConnectionsList";
import MonthlyBalanceCheckInDrawer from "~/components/accounts/MonthlyBalanceCheckInDrawer";
import AddEditAccountsDialogBtn from "~/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog";
import { AccountTypeEnum } from "~/containers/accounts/utils";
import { buildAccountRows } from "~/features/accounts/accountRows";
import { AccountsGroupList } from "~/features/accounts/components/AccountsGroupList";
import { AccountsSummary } from "~/features/accounts/components/AccountsSummary";
import { AnnualAllowancePill } from "~/features/savings/components/AnnualAllowancePill";
import type { loader } from "~/routes/app.accounts._index";
import { isFutureMonth } from "~/utils/accounts";
import { headerActions, pageRoot, section, sectionTitle } from "./AccountsContainer.styles";

const { INVESTMENT } = AccountTypeEnum;

const AccountsContainer: FC = () => {
  const {
    accounts = [],
    accountDetails = [],
    bankConnections = [],
    bankConnectionsEnabled = false,
  } = useLoaderData<typeof loader>();

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
      assets: snapshot.getTotalAssets(),
      liabilities: snapshot.getTotalLiabilities(),
      netWorth: snapshot.getTotalNetWorth(),
      studentLoans: snapshot.getTotalStudentLoans(),
      liquidCash: snapshot.getTotalLiquidCash(),
      weightedAvgApy:
        yieldingCashSum > 0 ? Math.round((weightedYieldSum / yieldingCashSum) * 100) / 100 : 0,
      isaUsed: Math.min(20000, isaUsed),
    };
  }, [snapshot]);

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
  }, [snapshot]);

  const rows = useMemo(
    () => buildAccountRows(accounts as never[], accountDetails as never[]),
    [accounts, accountDetails],
  );

  return (
    <div className={pageRoot()}>
      <PageHeader
        actions={
          <div className={headerActions()}>
            <MonthlyBalanceCheckInDrawer
              accounts={accounts}
              accountDetails={accountDetails as RawAccountDetail[]}
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
              taxBand="higher"
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
