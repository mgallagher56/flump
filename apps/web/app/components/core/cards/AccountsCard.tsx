import { css } from "@repo/ui/styled-system/css";
import { type FC, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLoaderData, useNavigate } from "react-router";
import AccountDetailChart from "~/components/charts/AccountDetailChart";
import FLPHeading from "~/components/core/typography/FLPHeading";
import AddEditAccountsDialogBtn from "~/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog";
import type { AccountDetail } from "~/containers/accounts/types";
import type { AccountTypeEnum } from "~/containers/accounts/utils";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
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
  const { formatCurrency } = useFormatCurrency();
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

  const headerWrapperStyle = css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
  });

  const headerTextStyle = css({
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    cursor: "pointer",
    flex: 1,
  });

  const bodyStyle = css({
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    cursor: "pointer",
    marginTop: "8px",
  });

  const balanceRowStyle = css({
    display: "flex",
    alignItems: "baseline",
    gap: "8px",
    marginBottom: "16px",
  });

  const balanceValStyle = css({
    fontSize: "22px",
    fontWeight: "bold",
    color: "text.primary",
  });

  const percentBadgeStyle = (isUp: boolean) =>
    css({
      fontSize: "11px",
      fontWeight: "bold",
      padding: "2px 8px",
      borderRadius: "full",
      backgroundColor: isUp ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
      color: isUp ? "success.500" : "destructive",
      display: "inline-flex",
      alignItems: "center",
      gap: "2px",
    });

  const chartContainerStyle = css({
    flex: 1,
    height: "100%",
    minHeight: "100px",
    marginTop: "auto",
    marginLeft: "-20px",
    marginRight: "-20px",
    marginBottom: "-20px",
    overflow: "hidden",
    borderBottomLeftRadius: "lg",
    borderBottomRightRadius: "lg",
  });

  const cardStyle = css({
    height: "280px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "20px",
    position: "relative",
    overflow: "hidden",
    transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
    "&:hover": {
      transform: "translateY(-4px)",
      boxShadow: "md",
      borderColor: "primary",
    },
  });

  const isUp = prevAccountBalance <= accountBalance;
  const trendLabel =
    currentPercentageChangeValue >= 0
      ? `+${currentPercentageChangeValue}%`
      : `${currentPercentageChangeValue}%`;

  return (
    <FLPCard className={cardStyle} id={accountId}>
      <div className={headerWrapperStyle}>
        <div
          className={headerTextStyle}
          role="button"
          tabIndex={0}
          onClick={onViewClick}
          onKeyDown={handleKeyDown}
        >
          <FLPHeading as="h5" color="text.muted" size="xs">
            {`${type} ${t("account")}`}
          </FLPHeading>
          <FLPHeading as="h4" color="blue.500" size="md">
            {name}
          </FLPHeading>
        </div>
        <AddEditAccountsDialogBtn accountId={accountId} isEditAccount={true} isIconButton={true} />
      </div>

      <div
        className={bodyStyle}
        role="button"
        tabIndex={0}
        onClick={onViewClick}
        onKeyDown={handleKeyDown}
      >
        <div className={balanceRowStyle}>
          {!!accountBalance && (
            <>
              <span className={balanceValStyle}>{formatCurrency(accountBalance)}</span>
              {!!prevAccountBalance && (
                <span className={percentBadgeStyle(isUp)}>
                  {isUp ? "↑" : "↓"} {trendLabel}
                </span>
              )}
            </>
          )}
        </div>
        {!!accountDetailYear.length && (
          <div className={chartContainerStyle}>
            <AccountDetailChart accountDetails={accountDetailYear} />
          </div>
        )}
      </div>
    </FLPCard>
  );
};

export default AccountsCard;
