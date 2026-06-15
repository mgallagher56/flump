import { css } from "@repo/ui/styled-system/css";
import { type FC, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaArrowLeft, FaCalendarPlus, FaChartArea, FaTable } from "react-icons/fa";
import { useFetcher, useLoaderData, useNavigate } from "react-router";
import AccountDetails from "~/components/accounts/AccountDetails";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPBox from "~/components/core/structure/FLPBox";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { loader } from "~/routes/app.accounts.$account";
import { currentYear, emptyObject } from "~/utils/utils";

const AccountDetailContainer: FC = () => {
  const { formatCurrency } = useFormatCurrency();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { account, accountDetails = [] } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const isLoading = fetcher.state !== "idle";

  const [activeTab, setActiveTab] = useState<"chart" | "table">("chart");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedValues, setEditedValues] = useState<{ [key: string]: { [key: string]: string } }>(
    emptyObject,
  );

  const availableYears = useMemo<number[]>(() => {
    const yrs = (accountDetails?.map((d: any) => d.year) || []).filter(
      (y: any) => typeof y === "number",
    );
    return Array.from(new Set(yrs)).sort((a: any, b: any) => b - a) as number[];
  }, [accountDetails]);

  // Calculate Latest Balance & Change
  const balanceStats = useMemo(() => {
    const sorted = [...(accountDetails || [])].sort((a: any, b: any) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    if (sorted.length === 0) {
      return { current: account?.balance ?? 0, prev: 0, percentChange: 0, isUp: true };
    }

    const latest = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];

    const currentBalance = latest.value;
    const prevBalance = prev?.value ?? 0;

    const percentChange =
      prevBalance !== 0 ? Math.round(((currentBalance - prevBalance) / prevBalance) * 100) : 0;

    return {
      current: currentBalance,
      prev: prevBalance,
      percentChange,
      isUp: currentBalance >= prevBalance,
    };
  }, [account, accountDetails]);

  const handleToggleEditMode = useCallback(() => {
    setIsEditMode((prev) => {
      const next = !prev;
      if (next) {
        setActiveTab("table"); // Automatically switch to table when editing
      }
      return next;
    });
  }, []);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    const { month, year } = event.target.dataset;
    setEditedValues((prev) => ({
      ...prev,
      [String(year)]: {
        ...(prev?.[String(year)] ?? emptyObject),
        [String(month)]: value,
      },
    }));
  }, []);

  const handleAddNewYear = useCallback(
    (selectedYear: number, yearToAdd: "current" | "prev" | "next") => {
      const nextYear = selectedYear + (yearToAdd === "prev" ? -1 : 1);
      const targetYear = yearToAdd === "current" ? currentYear : nextYear;

      fetcher.submit(
        {
          intent: "addYear",
          year: targetYear.toString(),
        },
        { method: "POST" },
      );
    },
    [fetcher],
  );

  const handleSaveValues = useCallback(
    (event: { preventDefault: () => void }) => {
      event.preventDefault();
      const updatedValues = Object.entries(editedValues).flatMap(([year, values]) =>
        Object.entries(values).map(([month, value]) => ({
          month: parseInt(month, 10),
          year: parseInt(year, 10),
          value: parseFloat(value),
        })),
      );

      fetcher.submit(
        {
          intent: "updateValues",
          values: JSON.stringify(updatedValues),
        },
        { method: "POST" },
      );

      setIsEditMode(false);
      setEditedValues(emptyObject);
    },
    [editedValues, fetcher],
  );

  // Styles
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
      backgroundColor: isUp ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
      color: isUp ? "success.500" : "destructive",
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
        <FLPText color="destructive">Account not found.</FLPText>
      </div>
    );
  }

  return (
    <div className={containerStyle}>
      {/* Back Link */}
      <div className={backLinkStyle} onClick={() => navigate("/app/accounts")}>
        <FaArrowLeft size={12} />
        Back to Accounts
      </div>

      {/* Account Info Header Card */}
      <div className={headerCardStyle}>
        <div>
          <FLPBox display="flex" alignItems="center" gap={2}>
            <span
              className={css({
                fontSize: "10px",
                fontWeight: "bold",
                textTransform: "uppercase",
                backgroundColor: "rgba(99, 99, 241, 0.1)",
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
              <span className={percentBadgeStyle(balanceStats.isUp)}>
                {balanceStats.isUp ? "↑" : "↓"}{" "}
                {balanceStats.percentChange >= 0
                  ? `+${balanceStats.percentChange}`
                  : balanceStats.percentChange}
                %
              </span>
            )}
          </div>
        </div>

        <FLPBox display="flex" gap={3}>
          {isEditMode ? (
            <>
              <FLPButton
                disabled={isLoading}
                variant="outline"
                onClick={() => {
                  setIsEditMode(false);
                  setEditedValues(emptyObject);
                }}
              >
                Cancel
              </FLPButton>
              <FLPButton disabled={isLoading} onClick={handleSaveValues}>
                {t("save")}
              </FLPButton>
            </>
          ) : (
            <FLPButton disabled={isLoading} variant="outline" onClick={handleToggleEditMode}>
              {t("edit")}
            </FLPButton>
          )}
        </FLPBox>
      </div>

      {/* Tabs Menu */}
      {!isEditMode && (
        <div className={tabContainerStyle}>
          <button
            className={tabBtnStyle(activeTab === "chart")}
            type="button"
            onClick={() => setActiveTab("chart")}
          >
            <FaChartArea size={14} />
            History Trend
          </button>
          <button
            className={tabBtnStyle(activeTab === "table")}
            type="button"
            onClick={() => setActiveTab("table")}
          >
            <FaTable size={14} />
            Values Table
          </button>
        </div>
      )}

      {/* Details Display (Chart or Table) */}
      <FLPCard>
        <AccountDetails
          activeTab={activeTab}
          editedValues={editedValues}
          isEditMode={isEditMode}
          onInputChange={handleInputChange}
        />
      </FLPCard>

      {/* Year actions */}
      {!isEditMode && (
        <div className={actionsStyle}>
          {availableYears?.length ? (
            <>
              <FLPButton
                disabled={isLoading}
                size="sm"
                variant="outline"
                onClick={() => handleAddNewYear(availableYears[availableYears.length - 1], "prev")}
              >
                <FaCalendarPlus style={{ marginRight: "6px" }} />
                {t("addPrevYear")}
              </FLPButton>
              <FLPButton
                disabled={isLoading}
                size="sm"
                variant="outline"
                onClick={() => handleAddNewYear(availableYears[0], "next")}
              >
                <FaCalendarPlus style={{ marginRight: "6px" }} />
                {t("addNextYear")}
              </FLPButton>
            </>
          ) : (
            <FLPButton
              disabled={isLoading}
              size="sm"
              variant="outline"
              onClick={() => handleAddNewYear(new Date().getFullYear(), "current")}
            >
              <FaCalendarPlus style={{ marginRight: "6px" }} />
              {t("addCurrentYear")}
            </FLPButton>
          )}
        </div>
      )}
    </div>
  );
};

export default AccountDetailContainer;
