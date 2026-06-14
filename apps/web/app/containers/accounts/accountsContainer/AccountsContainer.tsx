import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLoaderData } from "react-router";
import AccountsCard from "~/components/core/cards/AccountsCard";
import FLPBox from "~/components/core/structure/FLPBox";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import AddEditAccountsDialogBtn from "~/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog";
import type { Account, AccountDetail } from "~/containers/accounts/types";
import { AccountTypeEnum, isAccountTypeValid } from "~/containers/accounts/utils";
import type { loader } from "~/routes/app.accounts._index";
import { monthYearSort } from "~/utils/accounts";
import { currentMonth, currentYear } from "~/utils/utils";

const { CURRENT, SAVING, MORTGAGE, CREDIT_CARD, LOAN, OWED } = AccountTypeEnum;

const AccountsContainer: FC = () => {
  const { t } = useTranslation();
  const { accounts = [], accountDetails = [] } = useLoaderData<typeof loader>();
  const accountTypeArr = useMemo(() => [CURRENT, SAVING, CREDIT_CARD, MORTGAGE, LOAN, OWED], []);

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

      const isAsset = [CURRENT, SAVING, OWED].includes(acc.type as AccountTypeEnum);
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

  const formatCurrency = (val: number) => {
    return Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const gridStyle = css({
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
    gap: "24px",
    marginBottom: "32px",
  });

  const summaryCardStyle = css({
    backgroundColor: "surface",
    border: "1px solid",
    borderColor: "border",
    borderRadius: "xl",
    padding: "20px",
    boxShadow: "sm",
  });

  const netWorthCardStyle = css({
    backgroundColor: "rgba(99, 99, 241, 0.1)",
    border: "1px solid",
    borderColor: "primary",
    borderRadius: "xl",
    padding: "20px",
    boxShadow: "sm",
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
    display: "flex",
    flexWrap: "wrap",
    gap: "20px",
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
        <div className={gridStyle}>
          {/* Net Worth Card */}
          <div className={netWorthCardStyle}>
            <FLPText color="gray.500" fontSize="xs" fontWeight="semibold" textTransform="uppercase">
              Net Worth
            </FLPText>
            <FLPHeading
              as="h2"
              color={stats.netWorth >= 0 ? "emerald.500" : "red.500"}
              mt={1}
              size="2xl"
            >
              {formatCurrency(stats.netWorth)}
            </FLPHeading>
          </div>

          {/* Assets Card */}
          <div className={summaryCardStyle}>
            <FLPText color="gray.500" fontSize="xs" fontWeight="semibold" textTransform="uppercase">
              Total Assets
            </FLPText>
            <FLPHeading as="h2" color="green.500" mt={1} size="xl">
              {formatCurrency(stats.assets)}
            </FLPHeading>
          </div>

          {/* Liabilities Card */}
          <div className={summaryCardStyle}>
            <FLPText color="gray.500" fontSize="xs" fontWeight="semibold" textTransform="uppercase">
              Total Liabilities
            </FLPText>
            <FLPHeading as="h2" color="red.500" mt={1} size="xl">
              {formatCurrency(stats.liabilities)}
            </FLPHeading>
          </div>
        </div>
      )}

      {/* Account Categories */}
      <FLPBox display="flex" flexDirection="column" gap={10}>
        {accountTypeArr.map((accountType) => {
          return (
            isAccountTypeValid(accountType, accounts) && (
              <Fragment key={accountType}>
                <div className={categoryRowStyle}>
                  <FLPHeading as="h2" color="gray.600" mb={4} size="lg">
                    {accountType}
                  </FLPHeading>
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
      </FLPBox>
    </>
  );
};

export default AccountsContainer;
