import { PortfolioSnapshot, type RawAccount, type RawAccountDetail } from "@flump/finance-engine";
import { chartColor } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { type FC, Fragment, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FaChartLine,
  FaCreditCard,
  FaExchangeAlt,
  FaHandHoldingUsd,
  FaHome,
  FaPiggyBank,
  FaShieldAlt,
  FaUserFriends,
  FaWallet,
} from "react-icons/fa";
import { useLoaderData, useSearchParams } from "react-router";
import BankConnectionsList from "~/components/accounts/BankConnectionsList";
import MonthlyBalanceCheckInDrawer from "~/components/accounts/MonthlyBalanceCheckInDrawer";
import AccountsCard from "~/components/core/cards/AccountsCard";
import FLPCard from "~/components/core/cards/FLPCard";
import StatMetric from "~/components/core/metrics/StatMetric";
import FLPBox from "~/components/core/structure/FLPBox";
import FLPTabs from "~/components/core/tabs/FLPTabs";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import AddEditAccountsDialogBtn from "~/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog";
import type { Account } from "~/containers/accounts/types";
import { AccountTypeEnum, isAccountTypeValid } from "~/containers/accounts/utils";
import { AnnualAllowancePill } from "~/features/savings/components/AnnualAllowancePill";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { loader } from "~/routes/app.accounts._index";
import { isFutureMonth } from "~/utils/accounts";

const {
  CURRENT,
  SAVING,
  MORTGAGE,
  CREDIT_CARD,
  LOAN,
  OVERDRAFT,
  OWED,
  INVESTMENT,
  PENSION,
  PROPERTY,
  STUDENT_LOAN,
} = AccountTypeEnum;

const AccountsContainer: FC = () => {
  const { formatCurrency } = useFormatCurrency();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "all";
  const [activeTab, setActiveTab] = useState(initialTab);

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

    const weightedAvgApy =
      yieldingCashSum > 0 ? Math.round((weightedYieldSum / yieldingCashSum) * 100) / 100 : 0;

    return {
      assets: snapshot.getTotalAssets(),
      liabilities: snapshot.getTotalLiabilities(),
      netWorth: snapshot.getTotalNetWorth(),
      property: snapshot.getTotalProperty(),
      studentLoans: snapshot.getTotalStudentLoans(),
      liquidCash: snapshot.getTotalLiquidCash(),
      weightedAvgApy,
      isaUsed: Math.min(20000, isaUsed),
    };
  }, [snapshot]);

  // Asset allocation preview bar: assets only (Property included, Student Loan excluded)
  const allocationSegments = useMemo(() => {
    const typeTotals: { [key: string]: number } = {};
    let totalAssets = 0;

    for (const acc of snapshot.getResolvedAccounts()) {
      if (!acc.isAsset || acc.nominalBalance <= 0) continue;
      totalAssets += acc.nominalBalance;
      typeTotals[acc.rawType] = (typeTotals[acc.rawType] || 0) + acc.nominalBalance;
    }

    // Institutional restrained palette
    const colorsMap: { [key: string]: string } = {
      [CURRENT]: chartColor("primary"),
      [SAVING]: chartColor("wealth"),
      [INVESTMENT]: chartColor("accentCyan"),
      [PENSION]: chartColor("accentPurple"),
      [PROPERTY]: chartColor("series5"),
    };

    return Object.entries(typeTotals).map(([type, val]) => {
      const percentage = totalAssets > 0 ? (val / totalAssets) * 100 : 0;
      return {
        type,
        value: val,
        percentage,
        color: colorsMap[type] || chartColor("primary"),
      };
    });
  }, [snapshot]);

  const getAccountTypeIcon = (type: string) => {
    const iconStyle = css({
      fontSize: "16px",
      display: "inline-block",
      verticalAlign: "middle",
    });

    switch (type) {
      case CURRENT:
        return <FaWallet className={iconStyle} style={{ color: chartColor("primary") }} />;
      case SAVING:
        return <FaPiggyBank className={iconStyle} style={{ color: chartColor("wealth") }} />;
      case INVESTMENT:
        return <FaChartLine className={iconStyle} style={{ color: chartColor("accentCyan") }} />;
      case PENSION:
        return <FaShieldAlt className={iconStyle} style={{ color: chartColor("accentPurple") }} />;
      case CREDIT_CARD:
        return <FaCreditCard className={iconStyle} style={{ color: chartColor("debt") }} />;
      case PROPERTY:
      case MORTGAGE:
        return <FaHome className={iconStyle} style={{ color: chartColor("debt") }} />;
      case OVERDRAFT:
        return <FaExchangeAlt className={`${iconStyle} ${css({ color: "status.danger.text" })}`} />;
      case LOAN:
        return (
          <FaHandHoldingUsd className={iconStyle} style={{ color: chartColor("accentPurple") }} />
        );
      case OWED:
        return <FaUserFriends className={iconStyle} style={{ color: chartColor("baseline") }} />;
      default:
        return <FaExchangeAlt className={iconStyle} />;
    }
  };

  const pageHeaderStyle = css({
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "16px",
    marginTop: "16px",
    marginBottom: "8px",
  });

  const kpiGridStyle = css({
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
    gap: "16px",
    marginBottom: "20px",
  });

  const kpiCardStyle = css({
    backgroundColor: "surface",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    borderRadius: "xl",
    padding: { base: "16px", md: "20px" },
    boxShadow: "card",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    height: "100%",
    minHeight: { base: "135px", md: "145px" },
  });

  const categorySectionStyle = css({
    marginBottom: "36px",
  });

  const categoryHeaderStyle = css({
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "16px",
    paddingBottom: "8px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
  });

  const categoryIconWrapperStyle = css({
    width: "28px",
    height: "28px",
    borderRadius: "md",
    backgroundColor: "surface.sunken",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
  });

  const cardListStyle = css({
    display: "grid",
    gridTemplateColumns: {
      base: "1fr",
      sm: "repeat(2, 1fr)",
      lg: "repeat(3, 1fr)",
      xl: "repeat(4, 1fr)",
    },
    gap: "20px",
  });

  // Filter accounts by tab category
  const renderAccountsForTypes = (types: AccountTypeEnum[]) => {
    const matchingTypes = types.filter((t) => isAccountTypeValid(t, accounts));
    if (matchingTypes.length === 0) {
      return (
        <div
          className={css({
            padding: "48px 24px",
            textAlign: "center",
            color: "text.muted",
            backgroundColor: "surface.sunken",
            borderRadius: "xl",
            borderWidth: "1px",
            borderStyle: "dashed",
            borderColor: "border.subtle",
            fontSize: "sm",
          })}
        >
          No accounts found in this category.
        </div>
      );
    }
    return matchingTypes.map((accountType) => (
      <Fragment key={accountType}>
        <div className={categorySectionStyle}>
          <div className={categoryHeaderStyle}>
            <div className={categoryIconWrapperStyle}>{getAccountTypeIcon(accountType)}</div>
            <FLPHeading as="h2" color="text.primary" size="sm">
              {accountType}
            </FLPHeading>
          </div>
          <div className={cardListStyle}>
            {accounts.map(
              ({ name, id, type, balance }) =>
                type === accountType && (
                  <AccountsCard
                    key={id}
                    accountId={id}
                    balance={balance !== undefined ? Number(balance) : undefined}
                    name={name}
                    type={type as AccountTypeEnum}
                  />
                ),
            )}
          </div>
        </div>
      </Fragment>
    ));
  };

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setSearchParams({ tab: val });
  };

  return (
    <>
      {/* Standard Institutional Page Header */}
      <div className={pageHeaderStyle}>
        <div>
          <FLPHeading as="h1" color="text.primary" size="2xl">
            {t("accounts")}
          </FLPHeading>
          <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
            Unified net worth, savings yield and UK allowance hub
          </FLPText>
        </div>

        <div
          className={css({ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" })}
        >
          <MonthlyBalanceCheckInDrawer
            accounts={accounts}
            accountDetails={accountDetails as RawAccountDetail[]}
          />
          <AddEditAccountsDialogBtn />
        </div>
      </div>

      {/* Primary Workspace: 2 Tabs - Overview & All Accounts */}
      <div className={css({ marginTop: "24px" })}>
        <FLPTabs
          variant="segmented"
          data={[
            {
              value: "overview",
              label: "Overview",
              children: (
                <FLPBox display="flex" flexDirection="column" gap={6} mt={4}>
                  {accounts.length > 0 ? (
                    <>
                      {/* 3-Second Top KPI Summary Row */}
                      <div className={kpiGridStyle}>
                        {/* Total Net Worth */}
                        <div className={kpiCardStyle}>
                          <StatMetric
                            delta={{
                              text: stats.netWorth >= 0 ? "Surplus" : "Deficit",
                              variant: stats.netWorth >= 0 ? "positive" : "negative",
                            }}
                            label="Total net worth"
                            subtext={
                              <span>
                                Assets: <strong>{formatCurrency(stats.assets)}</strong> •
                                Liabilities: <strong>{formatCurrency(stats.liabilities)}</strong>
                              </span>
                            }
                            tone={stats.netWorth >= 0 ? "positive" : "negative"}
                            value={formatCurrency(stats.netWorth)}
                          />
                        </div>

                        {/* Total Assets */}
                        <div className={kpiCardStyle}>
                          <StatMetric
                            delta={{
                              text: `${allocationSegments.length} categories`,
                              variant: "neutral",
                            }}
                            label="Total assets"
                            subtext="Cash, savings, investments, pensions & property"
                            tone="positive"
                            value={formatCurrency(stats.assets)}
                          />
                        </div>

                        {/* Total Liabilities */}
                        <div className={kpiCardStyle}>
                          <StatMetric
                            delta={{
                              text: stats.liabilities > 0 ? "Active debt" : "Debt-free",
                              variant: stats.liabilities > 0 ? "negative" : "positive",
                            }}
                            label="Total liabilities"
                            subtext="Mortgages, credit cards, loans & overdrafts"
                            tone={stats.liabilities > 0 ? "negative" : "neutral"}
                            value={formatCurrency(stats.liabilities)}
                          />
                        </div>

                        {/* Liquid Cash & Savings */}
                        <div className={kpiCardStyle}>
                          <StatMetric
                            delta={{
                              text:
                                stats.weightedAvgApy > 0
                                  ? `${stats.weightedAvgApy}% AER`
                                  : "0.0% AER",
                              variant: "positive",
                            }}
                            label="Liquid cash & savings"
                            subtext="Instant emergency reserve and checking liquidity"
                            tone="neutral"
                            value={formatCurrency(stats.liquidCash)}
                          />
                        </div>
                      </div>

                      {stats.studentLoans > 0 && (
                        <div
                          className={css({
                            color: "text.muted",
                            fontSize: "sm",
                            fontVariantNumeric: "tabular-nums",
                          })}
                          id="student-loans-line"
                        >
                          <p className={css({ margin: 0 })}>
                            Student loans (not in net worth):{" "}
                            <strong>{formatCurrency(stats.studentLoans)}</strong>
                          </p>
                          <p className={css({ margin: 0, fontSize: "xs" })}>
                            Repayments come out of your pay as you earn, and any balance left is
                            written off after the repayment term, so it is shown separately.
                          </p>
                        </div>
                      )}

                      {/* UK ISA Allowance Strip */}
                      <div>
                        <AnnualAllowancePill
                          contributingAccounts={accounts
                            .filter(
                              (acc) =>
                                acc.name.toLowerCase().includes("isa") || acc.type === INVESTMENT,
                            )
                            .map((acc) => ({
                              name: acc.name,
                              balance: Number(acc.balance) || 0,
                            }))}
                          currentAmount={stats.isaUsed}
                          taxBand="higher"
                          totalLimit={20000}
                          type="isa"
                        />
                      </div>

                      {/* Asset Allocation Preview Bar */}
                      {allocationSegments.length > 0 && (
                        <div
                          className={css({
                            backgroundColor: "surface",
                            borderWidth: "1px",
                            borderStyle: "solid",
                            borderColor: "border.subtle",
                            borderRadius: "xl",
                            padding: { base: "16px", md: "20px" },
                            boxShadow: "card",
                          })}
                        >
                          <div
                            className={css({
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "10px",
                            })}
                          >
                            <span
                              className={css({
                                fontSize: "xs",
                                fontWeight: "medium",
                                color: "text.muted",
                              })}
                            >
                              Asset allocation preview
                            </span>
                            <span
                              className={css({
                                fontSize: "xs",
                                color: "text.muted",
                                fontVariantNumeric: "tabular-nums",
                              })}
                            >
                              Total Assets: {formatCurrency(stats.assets)}
                            </span>
                          </div>

                          {/* Sunken well progress track */}
                          <div
                            className={css({
                              display: "flex",
                              height: "8px",
                              width: "100%",
                              borderRadius: "full",
                              overflow: "hidden",
                              backgroundColor: "surface.sunken",
                              borderWidth: "1px",
                              borderStyle: "solid",
                              borderColor: "border.subtle",
                              marginBottom: "14px",
                            })}
                          >
                            {allocationSegments.map((seg) => (
                              <div
                                key={seg.type}
                                style={{
                                  width: `${seg.percentage}%`,
                                  backgroundColor: seg.color,
                                  height: "100%",
                                }}
                              />
                            ))}
                          </div>

                          {/* Refined Legend with tabular numbers */}
                          <div className={css({ display: "flex", flexWrap: "wrap", gap: "16px" })}>
                            {allocationSegments.map((seg) => (
                              <div
                                key={seg.type}
                                className={css({
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                })}
                              >
                                <div
                                  style={{
                                    width: "8px",
                                    height: "8px",
                                    borderRadius: "50%",
                                    backgroundColor: seg.color,
                                    flexShrink: 0,
                                  }}
                                />
                                <span
                                  className={css({
                                    fontSize: "xs",
                                    fontWeight: "medium",
                                    color: "text.primary",
                                  })}
                                >
                                  {seg.type}
                                </span>
                                <span
                                  className={css({
                                    fontSize: "xs",
                                    color: "text.muted",
                                    fontVariantNumeric: "tabular-nums",
                                  })}
                                >
                                  ({Math.round(seg.percentage)}%)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      className={css({
                        padding: "48px 24px",
                        textAlign: "center",
                        color: "text.muted",
                        backgroundColor: "surface.sunken",
                        borderRadius: "xl",
                        borderWidth: "1px",
                        borderStyle: "dashed",
                        borderColor: "border.subtle",
                        fontSize: "sm",
                      })}
                    >
                      No accounts added yet. Click &quot;Add Account&quot; to begin tracking your
                      portfolio.
                    </div>
                  )}

                  <div className={css({ marginTop: "8px" })}>
                    <BankConnectionsList
                      connections={bankConnections}
                      canConnect={bankConnectionsEnabled}
                    />
                  </div>
                </FLPBox>
              ),
            },
            {
              value: "all-accounts",
              label: "All Accounts",
              children: (
                <FLPBox display="flex" flexDirection="column" gap={6} mt={4}>
                  {renderAccountsForTypes([
                    CURRENT,
                    SAVING,
                    INVESTMENT,
                    PENSION,
                    PROPERTY,
                    CREDIT_CARD,
                    MORTGAGE,
                    LOAN,
                    OVERDRAFT,
                    STUDENT_LOAN,
                    OWED,
                  ])}
                </FLPBox>
              ),
            },
          ]}
          value={activeTab === "all-accounts" || activeTab === "all" ? "all-accounts" : "overview"}
          onValueChange={handleTabChange}
        />
      </div>
    </>
  );
};

export default AccountsContainer;
