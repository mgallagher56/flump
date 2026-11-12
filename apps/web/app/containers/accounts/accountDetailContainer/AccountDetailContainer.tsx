import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo, useState } from "react";
import { FaArrowLeft, FaChartArea, FaTable } from "react-icons/fa";
import { Link, useLoaderData } from "react-router";
import AccountDetails from "~/components/accounts/AccountDetails";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPBox from "~/components/core/structure/FLPBox";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { isLiabilityType, toDisplayBalance } from "~/containers/accounts/utils";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { loader } from "~/routes/app.accounts.$account";
import { isFutureMonth } from "~/utils/accounts";

const AccountDetailContainer: FC = () => {
  const { formatCurrency } = useFormatCurrency();
  const { account, accountDetails = [] } = useLoaderData<typeof loader>();

  const [activeTab, setActiveTab] = useState<"chart" | "table">("chart");

  // Calculate Latest Balance & Change
  const balanceStats = useMemo(() => {
    const sorted = [...(accountDetails || [])]
      .filter((d: any) => !isFutureMonth(d.month, d.year))
      .sort((a: any, b: any) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

    if (sorted.length === 0) {
      return {
        current: toDisplayBalance(account?.type, account?.balance ?? 0),
        prev: 0,
        percentChange: 0,
        isUp: true,
      };
    }

    const latest = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];

    // Liabilities are stored as minus the amount owed; show the amount owed.
    const isLiability = isLiabilityType(account?.type);
    const currentBalance = toDisplayBalance(account?.type, latest.value);
    const prevBalance = toDisplayBalance(account?.type, prev?.value ?? 0);

    const percentChange =
      prevBalance !== 0 ? Math.round(((currentBalance - prevBalance) / prevBalance) * 100) : 0;
    const isUp = currentBalance >= prevBalance;
    const isFavorable = isLiability ? currentBalance <= prevBalance : isUp;

    return {
      current: currentBalance,
      prev: prevBalance,
      percentChange,
      isUp,
      isFavorable,
    };
  }, [account, accountDetails]);

  const containerStyle = css({
    display: "flex",
    flexDirection: "column",
    gap: "32px",
    paddingBottom: "48px",
  });

  const backLinkStyle = css({
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    color: "text.muted",
    fontSize: "sm",
    fontWeight: "medium",
    cursor: "pointer",
    textDecoration: "none",
    my: 4,
    width: "fit-content",
    "&:hover": {
      color: "primary",
    },
  });

  const headerCardStyle = css({
    padding: "24px",
    borderRadius: "lg",
    backgroundColor: "card",
    border: "1px solid",
    borderColor: "border",
    display: "flex",
    flexDirection: { base: "column", md: "row" },
    justifyContent: "space-between",
    alignItems: { base: "flex-start", md: "center" },
    gap: "20px",
  });

  const statGroupStyle = css({
    display: "flex",
    alignItems: "baseline",
    gap: "12px",
    marginTop: "8px",
  });

  const percentBadgeStyle = (isUp: boolean) =>
    css({
      fontSize: "xs",
      fontWeight: "bold",
      padding: "2px 8px",
      borderRadius: "full",
      backgroundColor: isUp
        ? "color-mix(in srgb, var(--colors-chart-wealth) 10%, transparent)"
        : "color-mix(in srgb, var(--colors-status-danger-text) 10%, transparent)",
      color: isUp ? "status.positive.text" : "status.danger.text",
      display: "inline-flex",
      alignItems: "center",
      gap: "2px",
    });

  const tabContainerStyle = css({
    display: "flex",
    gap: "16px",
    borderBottom: "1px solid",
    borderColor: "border",
    paddingBottom: "8px",
  });

  const tabBtnStyle = (active: boolean) =>
    css({
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 16px",
      fontSize: "sm",
      fontWeight: "semibold",
      color: active ? "primary" : "text.muted",
      cursor: "pointer",
      borderBottom: "2px solid",
      borderBottomColor: active ? "primary" : "transparent",
      marginBottom: "-10px",
      transition: "all 0.2s",
      "&:hover": {
        color: "primary",
      },
    });

  const actionsStyle = css({
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: "12px",
    marginTop: "16px",
  });

  if (!account) {
    return (
      <div className={containerStyle}>
        <FLPText color="status.danger.text">Account not found.</FLPText>
      </div>
    );
  }

  return (
    <div className={containerStyle}>
      {/* Back Link */}
      <Link className={backLinkStyle} to="/app/accounts">
        <FaArrowLeft size={12} />
        Back to accounts
      </Link>

      {/* Account Info Header Card */}
      <div className={headerCardStyle}>
        <div>
          <FLPBox display="flex" alignItems="center" gap={2}>
            <span
              className={css({
                fontSize: "10px",
                fontWeight: "bold",
                textTransform: "uppercase",
                backgroundColor: "color-mix(in srgb, var(--colors-primary) 10%, transparent)",
                color: "primary",
                padding: "2px 8px",
                borderRadius: "full",
              })}
            >
              {account.type}
            </span>
          </FLPBox>
          <FLPHeading as="h1" size="xl" mt={1}>
            {account.name}
          </FLPHeading>

          <div className={statGroupStyle}>
            <FLPHeading as="h2" size="2xl" color="text.primary">
              {formatCurrency(balanceStats.current)}
            </FLPHeading>
            {balanceStats.prev !== 0 && (
              <span className={percentBadgeStyle(balanceStats.isFavorable ?? balanceStats.isUp)}>
                {balanceStats.isUp ? "↑" : "↓"}{" "}
                {balanceStats.percentChange >= 0
                  ? `+${balanceStats.percentChange}`
                  : balanceStats.percentChange}
                %
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className={tabContainerStyle}>
        <button
          className={tabBtnStyle(activeTab === "chart")}
          type="button"
          onClick={() => setActiveTab("chart")}
        >
          <FaChartArea size={14} />
          History trend
        </button>
        <button
          className={tabBtnStyle(activeTab === "table")}
          type="button"
          onClick={() => setActiveTab("table")}
        >
          <FaTable size={14} />
          Values table
        </button>
      </div>

      {/* Details Display (Chart or Table) */}
      <FLPCard>
        <AccountDetails activeTab={activeTab} />
      </FLPCard>
    </div>
  );
};

export default AccountDetailContainer;
