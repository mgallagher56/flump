import { css } from "@repo/ui/styled-system/css";
import { type FC, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLoaderData, useNavigate } from "react-router";
import AccountDetailChart from "~/components/charts/AccountDetailChart";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPButtonGroup from "~/components/core/buttons/FLPButtonGroup";
import FLPHeading from "~/components/core/typography/FLPHeading";
import AddEditAccountsDialogBtn from "~/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog";
import type { AccountDetail } from "~/containers/accounts/types";
import type { AccountTypeEnum } from "~/containers/accounts/utils";
import type { loader } from "~/routes/app.accounts._index";
import { monthYearSort } from "~/utils/accounts";
import { currentMonth, currentYear } from "~/utils/utils";
import FLPCard from "./FLPCard";

interface AccountsCardProp {
  accountId: string;
  name: string;
  type: AccountTypeEnum;
}

const AccountsCard: FC<AccountsCardProp> = ({ accountId, name, type }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    accountDetails = [],
  }: {
    accountDetails?: AccountDetail[];
  } = useLoaderData<typeof loader>();

  const sortedAccountDetails = useMemo(() => {
    return accountDetails.filter((account) => account.account_id === accountId).sort(monthYearSort);
  }, [accountDetails, accountId]);

  const currentMonthIndex = sortedAccountDetails.findIndex(
    (account) => account.month === currentMonth && account.year === currentYear,
  );

  const accountDetailYear = useMemo(() => {
    if (sortedAccountDetails.length === 12) return sortedAccountDetails;
    if (currentMonthIndex === -1) return sortedAccountDetails.slice(-12);
    return sortedAccountDetails.slice(currentMonthIndex - 11, currentMonthIndex + 1);
  }, [currentMonthIndex, sortedAccountDetails]);

  const accountBalance = accountDetailYear[11]?.value;
  const prevAccountBalance = accountDetailYear[10]?.value;
  const secondPreviousAccountBalance = accountDetailYear[9]?.value;
  const prevPercentageChangeValue = Math.round(
    ((prevAccountBalance - secondPreviousAccountBalance) / secondPreviousAccountBalance) * 100,
  );
  const currentPercentageChangeValue = Math.round(
    ((accountBalance - prevAccountBalance) / prevAccountBalance) * 100,
  );

  const onViewClick = useCallback(
    () => navigate(`/app/accounts/${accountId}`),
    [accountId, navigate],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onViewClick();
      }
    },
    [onViewClick],
  );

  const headerStyle = css({
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    cursor: "pointer",
  });

  const bodyStyle = css({
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    cursor: "pointer",
    marginTop: "16px",
    marginBottom: "16px",
  });

  const rowStyle = css({
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
  });

  const statRootStyle = css({
    display: "flex",
    flexDirection: "column",
  });

  const statLabelStyle = css({
    fontSize: "10px",
    textTransform: "uppercase",
    color: "text.muted",
  });

  const statValueStyle = css({
    fontSize: "md",
    fontWeight: "bold",
    color: "text.primary",
  });

  const trendStyle = (isUp: boolean) =>
    css({
      fontSize: "10px",
      fontWeight: "semibold",
      color: isUp ? "emerald.500" : "destructive",
      marginTop: "2px",
    });

  const footerStyle = css({
    display: "flex",
    justifyContent: "flex-end",
  });

  const cardStyle = css({
    height: "325px",
    width: "250px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  });

  return (
    <FLPCard className={cardStyle} id={accountId}>
      {/* biome-ignore lint/a11y/useSemanticElements: using div for layout styling */}
      <div
        className={headerStyle}
        onClick={onViewClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        <FLPHeading as="h5" color="gray.500" size="xs">{`${type} ${t("account")}`}</FLPHeading>
        <FLPHeading as="h4" color="blue.500" size="lg">
          {name}
        </FLPHeading>
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: using div for layout styling */}
      <div
        className={bodyStyle}
        onClick={onViewClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        <div className={rowStyle}>
          {!!prevAccountBalance && (
            <div className={statRootStyle}>
              <span className={statLabelStyle}>{`${t("previous")}:`}</span>
              <span className={statValueStyle}>
                {Intl.NumberFormat("en-GB", {
                  style: "currency",
                  currency: "GBP",
                  maximumFractionDigits: 0,
                }).format(prevAccountBalance)}
              </span>
              {!!secondPreviousAccountBalance && (
                <span className={trendStyle(secondPreviousAccountBalance <= prevAccountBalance)}>
                  {prevPercentageChangeValue}%
                </span>
              )}
            </div>
          )}
          {!!accountBalance && (
            <div className={statRootStyle}>
              <span className={statLabelStyle}>{`${t("current")}:`}</span>
              <span className={statValueStyle}>
                {Intl.NumberFormat("en-GB", {
                  style: "currency",
                  currency: "GBP",
                  maximumFractionDigits: 0,
                }).format(accountBalance)}
              </span>
              {!!prevAccountBalance && (
                <span className={trendStyle(prevAccountBalance <= accountBalance)}>
                  {currentPercentageChangeValue}%
                </span>
              )}
            </div>
          )}
        </div>
        {!!accountDetailYear.length && <AccountDetailChart accountDetails={accountDetailYear} />}
      </div>
      <div className={footerStyle}>
        <FLPButtonGroup gap={4} attached={false}>
          <FLPButton size="sm" variant="outline" onClick={onViewClick}>
            {t("view")}
          </FLPButton>
          <AddEditAccountsDialogBtn accountId={accountId} btnSize="sm" isEditAccount={true} />
        </FLPButtonGroup>
      </div>
    </FLPCard>
  );
};

export default AccountsCard;
