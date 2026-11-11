import { css } from "@repo/ui/styled-system/css";
import { type FC, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLoaderData, useNavigate } from "react-router";
import AccountDetailChart from "~/components/charts/AccountDetailChart";
import FLPBadge from "~/components/core/badges/FLPBadge";
import FLPHeading from "~/components/core/typography/FLPHeading";
import AddEditAccountsDialogBtn from "~/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog";
import type { AccountDetail } from "~/containers/accounts/types";
import {
  type AccountTypeEnum,
  isLiabilityType,
  toDisplayBalance,
} from "~/containers/accounts/utils";
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

  // Liabilities are stored as minus the amount owed; show the amount owed.
  const isLiability = isLiabilityType(type);
  const currentBalance = toDisplayBalance(
    type,
    latestDetail?.value !== undefined
      ? Number(latestDetail.value)
      : balance !== undefined
        ? Number(balance)
        : undefined,
  );

  const prevDetail =
    currentMonthIndex > 0
      ? sortedAccountDetails[currentMonthIndex - 1]
      : sortedAccountDetails.length > 1
        ? sortedAccountDetails[sortedAccountDetails.length - 2]
        : undefined;

  const prevAccountBalance = toDisplayBalance(
    type,
    prevDetail?.value !== undefined ? Number(prevDetail.value) : undefined,
  );
  const secondPreviousDetail =
    currentMonthIndex > 1
      ? sortedAccountDetails[currentMonthIndex - 2]
      : sortedAccountDetails.length > 2
        ? sortedAccountDetails[sortedAccountDetails.length - 3]
        : undefined;
  const secondPreviousAccountBalance =
    secondPreviousDetail?.value !== undefined ? Number(secondPreviousDetail.value) : undefined;

  const currentPercentageChangeValue =
    currentBalance !== undefined && prevAccountBalance
      ? Math.round(((currentBalance - prevAccountBalance) / prevAccountBalance) * 100)
      : 0;

  const onViewClick = useCallback(
    () => navigate(`/app/accounts/${accountId}`),
    [accountId, navigate],
  );

  // Events from inner controls (the name and edit buttons) and from portalled dialogs bubble
  // through the React tree; only react to events that originate on the card itself.
  const isFromInnerControl = (e: React.SyntheticEvent) => {
    const target = e.target as Node;
    return (
      !e.currentTarget.contains(target) ||
      (target instanceof Element && target.closest("button, a, input") !== null)
    );
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isFromInnerControl(e)) return;
    onViewClick();
  };

  const isUp =
    prevAccountBalance !== undefined && currentBalance !== undefined
      ? prevAccountBalance <= currentBalance
      : true;
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

  const cardStyle = css({
    height: isMobileVariant ? "140px" : "155px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: { base: "14px", md: "16px" },
    position: "relative",
    overflow: "hidden",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    borderRadius: "xl",
    backgroundColor: "surface",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
    cursor: "pointer",
    _hover: {
      borderColor: "primary",
      boxShadow: "cardHover",
    },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "primary",
      outlineOffset: "2px",
    },
  });

  const topRowStyle = css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
  });

  const headerInfoStyle = css({
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    flex: 1,
    minWidth: 0,
  });

  const eyebrowStyle = css({
    fontSize: "xs", // 12px
    fontWeight: "medium",
    color: "text.muted",
    lineHeight: "1.2",
  });

  const accountNameStyle = css({
    fontSize: "sm", // 14px
    fontWeight: "semibold",
    color: "text.primary",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    letterSpacing: "-0.01em",
    // Rendered as a <button>, so reset the native chrome.
    display: "block",
    maxWidth: "100%",
    padding: "0",
    border: "none",
    backgroundColor: "transparent",
    textAlign: "left",
    cursor: "pointer",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  });

  const balanceSectionStyle = css({
    display: "flex",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "8px",
  });

  const balanceValueStyle = css({
    fontFamily: "var(--fonts-display, 'Plus Jakarta Sans', sans-serif)",
    fontSize: { base: "20px", md: "24px" },
    fontWeight: "bold",
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums",
    color: "text.primary",
    lineHeight: "1.2",
  });

  const chartWellStyle = css({
    height: "36px",
    marginTop: "auto",
    marginLeft: { base: "-14px", md: "-16px" },
    marginRight: { base: "-14px", md: "-16px" },
    marginBottom: { base: "-14px", md: "-16px" },
    overflow: "hidden",
    borderBottomLeftRadius: "xl",
    borderBottomRightRadius: "xl",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
    backgroundColor: "surface.sunken",
  });

  return (
    <FLPCard
      className={cardStyle}
      id={accountId}
      interactive={true}
      isMobile={isMobileVariant}
      onClick={handleClick}
    >
      <div>
        <div className={topRowStyle}>
          <div className={headerInfoStyle}>
            <span className={eyebrowStyle}>{`${type} ${t("account")}`}</span>
            {/* The name is the keyboard/AT entry point; the card-wide click is a pointer convenience. */}
            <button className={accountNameStyle} title={name} type="button" onClick={onViewClick}>
              {name}
            </button>
          </div>
          <AddEditAccountsDialogBtn
            accountId={accountId}
            isEditAccount={true}
            isIconButton={true}
          />
        </div>

        <div className={balanceSectionStyle}>
          {currentBalance !== undefined && (
            <>
              <span className={balanceValueStyle}>{formatCurrency(currentBalance)}</span>
              {prevAccountBalance !== undefined && (
                <FLPBadge size="sm" variant={isFavorable ? "positive" : "negative"}>
                  {isUp ? "↑" : "↓"} {trendLabel}
                </FLPBadge>
              )}
            </>
          )}
        </div>
      </div>

      {!!accountDetailYear.length && (
        <div className={chartWellStyle}>
          <AccountDetailChart accountDetails={accountDetailYear} />
        </div>
      )}
    </FLPCard>
  );
};

export default AccountsCard;
