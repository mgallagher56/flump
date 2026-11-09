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
import FLPBox from "~/components/core/structure/FLPBox";
import FLPTabs from "~/components/core/tabs/FLPTabs";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import AddEditAccountsDialogBtn from "~/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog";
import AnnualAllowancePill from "~/components/savings/AnnualAllowancePill";
import SavingsForecasterCard from "~/components/savings/SavingsForecasterCard";
import type { Account } from "~/containers/accounts/types";
import { AccountTypeEnum, isAccountTypeValid } from "~/containers/accounts/utils";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { loader } from "~/routes/app.accounts._index";
import { isFutureMonth, monthYearSort } from "~/utils/accounts";
import { currentMonth, currentYear } from "~/utils/utils";

const { CURRENT, SAVING, MORTGAGE, CREDIT_CARD, LOAN, OWED, INVESTMENT, PENSION } = AccountTypeEnum;

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
  } = useLoaderData<typeof loader>();

  // Calculate Net Worth, Assets, Liabilities, Liquid Cash, and Weighted Yield
  const stats = useMemo(() => {
    let totalAssets = 0;
    let totalLiabilities = 0;
    let liquidCash = 0;
    let weightedYieldSum = 0;
    let yieldingCashSum = 0;
    let isaUsed = 0;

    accounts.forEach((acc: Account) => {
      const accDetails = accountDetails
        .filter((detail: any) => (detail.account_id || detail.accountId) === acc.id)
        .filter((detail: any) => !isFutureMonth(detail.month, detail.year))
        .sort(monthYearSort);

      let balance = Number(acc.balance) || 0;
      if (accDetails.length > 0) {
        const curIndex = accDetails.findIndex(
          (detail: any) => detail.month === currentMonth && detail.year === currentYear,
        );
        if (curIndex !== -1) {
          balance = Number(accDetails[curIndex]?.value) ?? balance;
        } else {
          balance = Number(accDetails[accDetails.length - 1]?.value) ?? balance;
        }
      }

      const isAsset = [CURRENT, SAVING, OWED, INVESTMENT, PENSION].includes(
        acc.type as AccountTypeEnum,
      );
      if (isAsset) {
        totalAssets += balance;
        if (acc.type === CURRENT || acc.type === SAVING) {
          liquidCash += balance;
        }
        const apr = Number(acc.interestRate ?? 0);
        if (apr > 0 && balance > 0) {
          weightedYieldSum += balance * apr;
          yieldingCashSum += balance;
        }
        if (acc.name.toLowerCase().includes("isa") || acc.type === INVESTMENT) {
          isaUsed += balance;
        }
      } else {
        totalLiabilities += balance;
      }
    });

    const weightedAvgApy =
      yieldingCashSum > 0 ? Math.round((weightedYieldSum / yieldingCashSum) * 100) / 100 : 0;

    return {
      assets: totalAssets,
      liabilities: totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
      liquidCash,
      weightedAvgApy,
      isaUsed: Math.min(20000, isaUsed),
    };
  }, [accounts, accountDetails]);

  // Asset allocation preview bar
  const allocationSegments = useMemo(() => {
    let totalAssets = 0;
    const typeTotals: { [key: string]: number } = {};

    accounts.forEach((acc: Account) => {
      const accDetails = accountDetails
        .filter((detail: any) => (detail.account_id || detail.accountId) === acc.id)
        .filter((detail: any) => !isFutureMonth(detail.month, detail.year))
        .sort(monthYearSort);

      let balance = Number(acc.balance) || 0;
      if (accDetails.length > 0) {
        const curIndex = accDetails.findIndex(
          (detail: any) => detail.month === currentMonth && detail.year === currentYear,
        );
        balance =
          curIndex !== -1
            ? (Number(accDetails[curIndex]?.value) ?? balance)
            : (Number(accDetails[accDetails.length - 1]?.value) ?? balance);
      } else {
        balance = Number(acc.balance) ?? 0;
      }

      const isAsset = [CURRENT, SAVING, OWED, INVESTMENT, PENSION].includes(
        acc.type as AccountTypeEnum,
      );
      if (isAsset && balance > 0) {
        totalAssets += balance;
        typeTotals[acc.type] = (typeTotals[acc.type] || 0) + balance;
      }
    });

    const colorsMap: { [key: string]: string } = {
      [CURRENT]: "#6363F1",
      [SAVING]: "#10B981",
      [INVESTMENT]: "#F59E0B",
      [PENSION]: "#8B5CF6",
      [OWED]: "#64748b",
    };

    return Object.entries(typeTotals).map(([type, val]) => {
      const percentage = totalAssets > 0 ? (val / totalAssets) * 100 : 0;
      return {
        type,
        value: val,
        percentage,
        color: colorsMap[type] || "#3b82f6",
      };
    });
  }, [accounts, accountDetails]);

  const getAccountTypeIcon = (type: string) => {
    const iconStyle = css({
      fontSize: "20px",
      marginRight: "10px",
      display: "inline-block",
      verticalAlign: "middle",
    });

    switch (type) {
      case CURRENT:
        return <FaWallet className={iconStyle} style={{ color: "#6363F1" }} />;
      case SAVING:
        return <FaPiggyBank className={iconStyle} style={{ color: "#10b981" }} />;
      case INVESTMENT:
        return <FaChartLine className={iconStyle} style={{ color: "#f59e0b" }} />;
      case PENSION:
        return <FaShieldAlt className={iconStyle} style={{ color: "#8B5CF6" }} />;
      case CREDIT_CARD:
        return <FaCreditCard className={iconStyle} style={{ color: "#ec4899" }} />;
      case MORTGAGE:
        return <FaHome className={iconStyle} style={{ color: "#ef4444" }} />;
      case LOAN:
        return <FaHandHoldingUsd className={iconStyle} style={{ color: "#a855f7" }} />;
      case OWED:
        return <FaUserFriends className={iconStyle} style={{ color: "#64748b" }} />;
      default:
        return <FaExchangeAlt className={iconStyle} />;
    }
  };

  const gridStyle = css({
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
    gap: "24px",
    marginBottom: "24px",
  });

  const summaryCardStyle = css({
    backgroundColor: "card",
    border: "1px solid",
    borderColor: "border",
    borderRadius: "lg",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    boxShadow: "xs",
    transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "sm",
      borderColor: "primary",
    },
  });

  const netWorthCardStyle = css({
    backgroundColor: "rgba(99, 99, 241, 0.08)",
    _dark: {
      backgroundColor: "rgba(99, 99, 241, 0.15)",
    },
    border: "1px solid",
    borderColor: "primary",
    borderRadius: "lg",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    boxShadow: "sm",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "md",
    },
  });

  const headerStyle = css({
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "16px",
    marginTop: "20px",
    marginBottom: "20px",
  });

  const categoryRowStyle = css({
    borderBottom: "1px solid",
    borderColor: "border",
    paddingBottom: "24px",
    marginBottom: "40px",
  });

  const cardListStyle = css({
    display: "grid",
    gridTemplateColumns: {
      base: "1fr",
      sm: "repeat(2, 1fr)",
      md: "repeat(3, 1fr)",
      lg: "repeat(4, 1fr)",
    },
    gap: "24px",
    marginTop: "16px",
  });

  // Filter accounts by tab category
  const renderAccountsForTypes = (types: AccountTypeEnum[]) => {
    const matchingTypes = types.filter((t) => isAccountTypeValid(t, accounts));
    if (matchingTypes.length === 0) {
      return (
        <div className={css({ padding: "40px 0", textAlign: "center", color: "text.muted" })}>
          No accounts found in this category.
        </div>
      );
    }
    return matchingTypes.map((accountType) => (
      <Fragment key={accountType}>
        <div className={categoryRowStyle}>
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              marginBottom: "16px",
              pb: 2,
              borderBottom: "1px solid",
              borderColor: "border",
            })}
          >
            {getAccountTypeIcon(accountType)}
            <FLPHeading as="h2" color="text.primary" size="lg">
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
                    name={name}
                    type={type as AccountTypeEnum}
                    balance={balance !== undefined ? Number(balance) : undefined}
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
      {/* Title & Actions */}
      <div className={headerStyle}>
        <div>
          <FLPHeading as="h1" color="blue.500" size="xl">
            {t("accounts")}
          </FLPHeading>
          <FLPText fontSize="sm" color="text.muted" className={css({ marginTop: "4px" })}>
            Unified net worth, savings yield and UK allowance hub
          </FLPText>
        </div>

        <div
          className={css({ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" })}
        >
          <MonthlyBalanceCheckInDrawer accounts={accounts} />
          <AddEditAccountsDialogBtn />
        </div>
      </div>

      {/* Top Summary Bar: Net Worth, Liquid Cash & Yield, and ISA Allowance Pill */}
      {accounts.length > 0 && (
        <>
          <div className={gridStyle}>
            {/* Total Net Worth */}
            <div className={netWorthCardStyle}>
              <FLPText
                color="gray.500"
                fontSize="xs"
                fontWeight="semibold"
                textTransform="uppercase"
              >
                Total net worth
              </FLPText>
              <FLPHeading
                as="h2"
                color={stats.netWorth >= 0 ? "success.500" : "destructive.500"}
                mt={1}
                size="2xl"
              >
                {formatCurrency(stats.netWorth)}
              </FLPHeading>
              <FLPText fontSize="xs" color="text.muted">
                Assets: {formatCurrency(stats.assets)} • Liabilities:{" "}
                {formatCurrency(stats.liabilities)}
              </FLPText>
            </div>

            {/* Total Liquid Cash & Savings (with Weighted Average AER) */}
            <div className={summaryCardStyle}>
              <FLPText
                color="gray.500"
                fontSize="xs"
                fontWeight="semibold"
                textTransform="uppercase"
              >
                Liquid cash and savings
              </FLPText>
              <FLPHeading as="h2" color="success.500" mt={1} size="xl">
                {formatCurrency(stats.liquidCash)}
              </FLPHeading>
              <FLPText fontSize="xs" color="text.muted">
                Weighted yield:{" "}
                <strong>
                  {stats.weightedAvgApy > 0 ? `${stats.weightedAvgApy}% AER` : "0.0%"}
                </strong>
              </FLPText>
            </div>

            {/* UK £20,000 ISA Allowance Progress Pill */}
            <div>
              <AnnualAllowancePill
                type="isa"
                currentAmount={stats.isaUsed}
                totalLimit={20000}
                taxBand="higher"
              />
            </div>
          </div>

          {/* Asset Allocation Preview Bar */}
          {allocationSegments.length > 0 && (
            <div
              className={css({
                backgroundColor: "card",
                border: "1px solid",
                borderColor: "border",
                borderRadius: "lg",
                padding: "16px 24px",
                marginBottom: "32px",
                boxShadow: "xs",
              })}
            >
              <div
                className={css({
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                })}
              >
                <FLPText
                  fontSize="xs"
                  fontWeight="semibold"
                  color="text.muted"
                  textTransform="uppercase"
                >
                  Asset allocation preview
                </FLPText>
              </div>
              <div
                className={css({
                  display: "flex",
                  height: "8px",
                  width: "100%",
                  borderRadius: "full",
                  overflow: "hidden",
                  backgroundColor: "secondary",
                  marginBottom: "12px",
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
              <div className={css({ display: "flex", flexWrap: "wrap", gap: "16px" })}>
                {allocationSegments.map((seg) => (
                  <div
                    key={seg.type}
                    className={css({ display: "flex", alignItems: "center", gap: "6px" })}
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: seg.color,
                      }}
                    />
                    <FLPText fontSize="xs" fontWeight="medium" color="text.primary">
                      {seg.type}
                    </FLPText>
                    <FLPText fontSize="xs" color="text.muted">
                      ({Math.round(seg.percentage)}%)
                    </FLPText>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Tabs list: All | Cash & current | Savings & ISAs | Investments & pensions | Credit & debt | Mortgages */}
      <div className={css({ marginTop: "24px" })}>
        <FLPTabs
          value={activeTab}
          onValueChange={handleTabChange}
          data={[
            {
              value: "all",
              label: "All accounts",
              children: (
                <FLPBox display="flex" flexDirection="column" gap={10} mt={4}>
                  {renderAccountsForTypes([
                    CURRENT,
                    SAVING,
                    INVESTMENT,
                    PENSION,
                    CREDIT_CARD,
                    MORTGAGE,
                    LOAN,
                    OWED,
                  ])}
                </FLPBox>
              ),
            },
            {
              value: "cash-current",
              label: "Cash & current",
              children: (
                <FLPBox display="flex" flexDirection="column" gap={10} mt={4}>
                  {renderAccountsForTypes([CURRENT])}
                </FLPBox>
              ),
            },
            {
              value: "savings-yield",
              label: "Savings & ISAs (yield & compound forecaster)",
              children: (
                <FLPBox display="flex" flexDirection="column" gap={8} mt={4}>
                  <SavingsForecasterCard
                    startingBalance={stats.liquidCash}
                    monthlyContribution={200}
                    portfolioInterestRate={stats.weightedAvgApy || 4.5}
                    accounts={accounts}
                  />
                  {renderAccountsForTypes([SAVING])}
                </FLPBox>
              ),
            },
            {
              value: "investments-pensions",
              label: "Investments & pensions",
              children: (
                <FLPBox display="flex" flexDirection="column" gap={10} mt={4}>
                  {renderAccountsForTypes([INVESTMENT, PENSION])}
                </FLPBox>
              ),
            },
            {
              value: "credit-debt",
              label: "Credit & debt",
              children: (
                <FLPBox display="flex" flexDirection="column" gap={10} mt={4}>
                  {renderAccountsForTypes([CREDIT_CARD, LOAN, OWED])}
                </FLPBox>
              ),
            },
            {
              value: "mortgages",
              label: "Mortgages",
              children: (
                <FLPBox display="flex" flexDirection="column" gap={10} mt={4}>
                  {renderAccountsForTypes([MORTGAGE])}
                </FLPBox>
              ),
            },
            {
              value: "bank-connections",
              label: "Open banking connections",
              children: (
                <div style={{ marginTop: "16px" }}>
                  <BankConnectionsList connections={bankConnections} />
                </div>
              ),
            },
          ]}
        />
      </div>
    </>
  );
};

export default AccountsContainer;
