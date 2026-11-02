import { css } from "@repo/ui/styled-system/css";
import { type FC, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLoaderData, useNavigate } from "react-router";
import AccountDetailChart from "~/components/charts/AccountDetailChart";
import FLPHeading from "~/components/core/typography/FLPHeading";
import AddEditAccountsDialogBtn from "~/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog";
import type { AccountDetail } from "~/containers/accounts/types";
import type { AccountTypeEnum } from "~/containers/accounts/utils";
import { useResponsive } from "~/context/ResponsiveContext";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { loader } from "~/routes/app.accounts._index";
import { isFutureMonth, monthYearSort } from "~/utils/accounts";
import { currentMonth, currentYear } from "~/utils/utils";
import FLPCard from "./FLPCard";

export interface AccountsCardProp {
  accountId: string;
  name: string;
  type: AccountTypeEnum;
  balance?: number;
  isMobile?: boolean;
  variant?: "desktop" | "mobile";
}

const AccountsCard: FC<AccountsCardProp> = ({
  accountId,
  name,
  type,
  balance,
  isMobile: propIsMobile,
  variant = "desktop",
}) => {
  const { formatCurrency } = useFormatCurrency();
  const { isMobile: contextIsMobile } = useResponsive();
  const isMobileVariant = propIsMobile ?? (variant === "mobile" ? true : contextIsMobile);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    accountDetails = [],
  }: {
    accountDetails?: (AccountDetail & { accountId?: string })[];
  } = useLoaderData<typeof loader>();

  const sortedAccountDetails = useMemo(() => {
    return accountDetails
      .filter((account) => (account.account_id || (account as any).accountId) === accountId)
      .filter((account) => !isFutureMonth(account.month, account.year))
      .sort(monthYearSort);
  }, [accountDetails, accountId]);

  const currentMonthIndex = sortedAccountDetails.findIndex(
    (account) => account.month === currentMonth && account.year === currentYear,
  );

  const accountDetailYear = useMemo(() => {
    return sortedAccountDetails.slice(-12);
  }, [sortedAccountDetails]);

  const latestDetail =
    currentMonthIndex !== -1
      ? sortedAccountDetails[currentMonthIndex]
      : sortedAccountDetails[sortedAccountDetails.length - 1];

  const currentBalance =
    latestDetail?.value !== undefined
      ? Number(latestDetail.value)
      : balance !== undefined
        ? Number(balance)
        : undefined;

  const prevDetail =
    currentMonthIndex > 0
      ? sortedAccountDetails[currentMonthIndex - 1]
      : sortedAccountDetails.length > 1
        ? sortedAccountDetails[sortedAccountDetails.length - 2]
        : undefined;

  const prevAccountBalance = prevDetail?.value !== undefined ? Number(prevDetail.value) : undefined;
  const secondPreviousDetail =
    currentMonthIndex > 1
      ? sortedAccountDetails[currentMonthIndex - 2]
      : sortedAccountDetails.length > 2
        ? sortedAccountDetails[sortedAccountDetails.length - 3]
        : undefined;
  const secondPreviousAccountBalance =
    secondPreviousDetail?.value !== undefined ? Number(secondPreviousDetail.value) : undefined;

  const prevPercentageChangeValue =
    prevAccountBalance !== undefined && secondPreviousAccountBalance
      ? Math.round(
          ((prevAccountBalance - secondPreviousAccountBalance) / secondPreviousAccountBalance) *
            100,
        )
      : 0;
  const currentPercentageChangeValue =
    currentBalance !== undefined && prevAccountBalance
      ? Math.round(((currentBalance - prevAccountBalance) / prevAccountBalance) * 100)
      : 0;

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
    height: isMobileVariant ? "220px" : "280px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: isMobileVariant ? "14px" : "20px",
    position: "relative",
    overflow: "hidden",
    transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
    "&:hover": {
      transform: "translateY(-4px)",
      boxShadow: "md",
      borderColor: "primary",
    },
  });

  const isUp =
    prevAccountBalance !== undefined && currentBalance !== undefined
      ? prevAccountBalance <= currentBalance
      : true;
  const isLiability = ["Mortgage", "Loan", "Credit Card"].includes(type);
  const isFavorable =
    prevAccountBalance !== undefined && currentBalance !== undefined
      ? isLiability
        ? currentBalance <= prevAccountBalance
        : isUp
      : true;
  const trendLabel =
    currentPercentageChangeValue >= 0
      ? `+${currentPercentageChangeValue}%`
      : `${currentPercentageChangeValue}%`;

  return (
    <FLPCard className={cardStyle} id={accountId} isMobile={isMobileVariant}>
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
          {currentBalance !== undefined && (
            <>
              <span className={balanceValStyle}>{formatCurrency(currentBalance)}</span>
              {prevAccountBalance !== undefined && (
                <span className={percentBadgeStyle(isFavorable)}>
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
