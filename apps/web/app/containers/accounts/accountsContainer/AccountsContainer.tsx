import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  FaChartLine,
  FaCreditCard,
  FaExchangeAlt,
  FaHandHoldingUsd,
  FaHome,
  FaPiggyBank,
  FaUserFriends,
  FaWallet,
} from "react-icons/fa";
import { useLoaderData } from "react-router";
import BankConnectionsList from "~/components/accounts/BankConnectionsList";
import AccountsCard from "~/components/core/cards/AccountsCard";
import FLPBox from "~/components/core/structure/FLPBox";
import FLPTabs from "~/components/core/tabs/FLPTabs";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import AddEditAccountsDialogBtn from "~/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog";
import type { Account, AccountDetail } from "~/containers/accounts/types";
import { AccountTypeEnum, isAccountTypeValid } from "~/containers/accounts/utils";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { loader } from "~/routes/app.accounts._index";
import { monthYearSort } from "~/utils/accounts";
import { currentMonth, currentYear } from "~/utils/utils";

const { CURRENT, SAVING, MORTGAGE, CREDIT_CARD, LOAN, OWED, INVESTMENT } = AccountTypeEnum;

const AccountsContainer: FC = () => {
  const { formatCurrency } = useFormatCurrency();
  const { t } = useTranslation();
  const {
    accounts = [],
    accountDetails = [],
    bankConnections = [],
  } = useLoaderData<typeof loader>();
  const accountTypeArr = useMemo(
    () => [CURRENT, SAVING, INVESTMENT, CREDIT_CARD, MORTGAGE, LOAN, OWED],
    [],
  );

  // Calculate Net Worth, Assets, Liabilities
  const stats = useMemo(() => {
    let totalAssets = 0;
    let totalLiabilities = 0;

    accounts.forEach((acc: Account) => {
      const accDetails = accountDetails
        .filter((detail: AccountDetail) => detail.account_id === acc.id)
        .sort(monthYearSort);

      if (accDetails.length === 0) return;

      const curIndex = accDetails.findIndex(
        (detail: AccountDetail) => detail.month === currentMonth && detail.year === currentYear,
      );

      let balance = 0;
      if (curIndex !== -1) {
        balance = accDetails[curIndex]?.value ?? 0;
      } else {
        balance = accDetails[accDetails.length - 1]?.value ?? 0;
      }

      const isAsset = [CURRENT, SAVING, OWED, INVESTMENT].includes(acc.type as AccountTypeEnum);
      if (isAsset) {
        totalAssets += balance;
      } else {
        totalLiabilities += balance;
      }
    });

    return {
      assets: totalAssets,
      liabilities: totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
    };
  }, [accounts, accountDetails]);

  // Asset allocation preview bar
  const allocationSegments = useMemo(() => {
    let totalAssets = 0;
    const typeTotals: { [key: string]: number } = {};

    accounts.forEach((acc: Account) => {
      const accDetails = accountDetails
        .filter((detail: AccountDetail) => detail.account_id === acc.id)
        .sort(monthYearSort);

      let balance = 0;
      if (accDetails.length > 0) {
        const curIndex = accDetails.findIndex(
          (detail: AccountDetail) => detail.month === currentMonth && detail.year === currentYear,
        );
        balance =
          curIndex !== -1
            ? (accDetails[curIndex]?.value ?? 0)
            : (accDetails[accDetails.length - 1]?.value ?? 0);
      } else {
        balance = acc.balance ?? 0;
      }

      const isAsset = [CURRENT, SAVING, OWED, INVESTMENT].includes(acc.type as AccountTypeEnum);
      if (isAsset && balance > 0) {
        totalAssets += balance;
        typeTotals[acc.type] = (typeTotals[acc.type] || 0) + balance;
      }
    });

    const colorsMap: { [key: string]: string } = {
      [CURRENT]: "#6363F1",
      [SAVING]: "#10B981",
      [INVESTMENT]: "#F59E0B",
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
    marginBottom: "32px",
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

  return (
    <>
      {/* Title & Actions */}
      <div className={headerStyle}>
        <FLPHeading as="h1" color="blue.500" size="xl">
          {t("accounts")}
        </FLPHeading>
        <AddEditAccountsDialogBtn />
      </div>

      {/* Summary Stats Header */}
      {accounts.length > 0 && (
        <>
          <div className={gridStyle}>
            {/* Net Worth Card */}
            <div className={netWorthCardStyle}>
              <FLPText
                color="gray.500"
                fontSize="xs"
                fontWeight="semibold"
                textTransform="uppercase"
              >
                Net Worth
              </FLPText>
              <FLPHeading
                as="h2"
                color={stats.netWorth >= 0 ? "success.500" : "destructive.500"}
                mt={1}
                size="2xl"
              >
                {formatCurrency(stats.netWorth)}
              </FLPHeading>
            </div>

            {/* Assets Card */}
            <div className={summaryCardStyle}>
              <FLPText
                color="gray.500"
                fontSize="xs"
                fontWeight="semibold"
                textTransform="uppercase"
              >
                Total Assets
              </FLPText>
              <FLPHeading as="h2" color="success.500" mt={1} size="xl">
                {formatCurrency(stats.assets)}
              </FLPHeading>
            </div>

            {/* Liabilities Card */}
            <div className={summaryCardStyle}>
              <FLPText
                color="gray.500"
                fontSize="xs"
                fontWeight="semibold"
                textTransform="uppercase"
              >
                Total Liabilities
              </FLPText>
              <FLPHeading as="h2" color="destructive.500" mt={1} size="xl">
                {formatCurrency(stats.liabilities)}
              </FLPHeading>
            </div>
          </div>

          {/* Allocation Preview Bar */}
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
                  Asset Allocation Preview
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

      {/* Tabs list for Accounts vs Bank Connections */}
      <div className={css({ marginTop: "24px" })}>
        <FLPTabs
          data={[
            {
              value: "my-accounts",
              label: "My Accounts",
              children: (
                <FLPBox display="flex" flexDirection="column" gap={10} mt={4}>
                  {accountTypeArr.map((accountType) => {
                    return (
                      isAccountTypeValid(accountType, accounts) && (
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
                                ({ name, id, type }) =>
                                  type === accountType && (
                                    <AccountsCard
                                      key={id}
                                      accountId={id}
                                      name={name}
                                      type={type as AccountTypeEnum}
                                    />
                                  ),
                              )}
                            </div>
                          </div>
                        </Fragment>
                      )
                    );
                  })}
                  {accounts.length === 0 && (
                    <div
                      className={css({
                        padding: "64px 24px",
                        textAlign: "center",
                        border: "2px dashed",
                        borderColor: "border",
                        borderRadius: "lg",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "16px",
                        maxWidth: "480px",
                        margin: "40px auto",
                      })}
                    >
                      <div
                        className={css({
                          width: "56px",
                          height: "56px",
                          borderRadius: "full",
                          backgroundColor: "rgba(99, 99, 241, 0.08)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "24px",
                          color: "primary",
                        })}
                      >
                        <FaWallet />
                      </div>
                      <div>
                        <FLPHeading as="h3" size="md" mb={1}>
                          No Accounts Connected
                        </FLPHeading>
                        <FLPText color="text.muted" fontSize="sm">
                          Connect your bank accounts securely or create manual ones to start
                          tracking your net worth and asset allocation progression.
                        </FLPText>
                      </div>
                    </div>
                  )}
                </FLPBox>
              ),
            },
            {
              value: "bank-connections",
              label: "Bank Connections",
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
