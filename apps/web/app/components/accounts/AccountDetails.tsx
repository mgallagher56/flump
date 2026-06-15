import { css } from "@repo/ui/styled-system/css";
import type { ChangeEvent, FC } from "react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FaTrashAlt } from "react-icons/fa";
import { useFetcher, useLoaderData } from "react-router";
import AccountDetailChart from "~/components/charts/AccountDetailChart";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { loader } from "~/routes/app.accounts.$account";

interface AccountDetailsProps {
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  editedValues: { [key: string]: { [key: string]: string } };
  isEditMode: boolean;
  activeTab?: "chart" | "table";
}

const AccountDetails: FC<AccountDetailsProps> = ({
  onInputChange,
  editedValues,
  isEditMode,
  activeTab = "table",
}) => {
  const { t } = useTranslation();
  const { accountDetails = [] } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const onRemoveYear = useCallback(
    (year: number) => {
      fetcher.submit(
        {
          intent: "deleteYear",
          year: year.toString(),
        },
        { method: "POST" },
      );
    },
    [fetcher],
  );

  // Chronological sorting for chart & MoM change calculations
  const { sortedDetails, balanceMap, changeMap, uniqueYears } = useMemo(() => {
    const sorted = [...accountDetails].sort((a: any, b: any) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    const bMap: { [year: number]: { [month: number]: number } } = {};
    const cMap: {
      [year: number]: { [month: number]: { change: number; percent: number; hasPrev: boolean } };
    } = {};
    const yrsSet = new Set<number>();

    sorted.forEach((detail: any, index: number) => {
      yrsSet.add(detail.year);
      if (!bMap[detail.year]) bMap[detail.year] = {};
      bMap[detail.year][detail.month] = detail.value;

      const prev = index > 0 ? sorted[index - 1] : null;
      let change = 0;
      let percent = 0;
      let hasPrev = false;

      if (prev) {
        change = detail.value - prev.value;
        percent = prev.value !== 0 ? Math.round((change / prev.value) * 100) : 0;
        hasPrev = true;
      }

      if (!cMap[detail.year]) cMap[detail.year] = {};
      cMap[detail.year][detail.month] = { change, percent, hasPrev };
    });

    return {
      sortedDetails: sorted,
      balanceMap: bMap,
      changeMap: cMap,
      uniqueYears: Array.from(yrsSet).sort((a, b) => b - a),
    };
  }, [accountDetails]);

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => 12 - i), []); // Dec to Jan

  const getMonthName = (monthNum: number) => {
    return new Date(0, monthNum - 1).toLocaleString("default", { month: "long" });
  };

  // Calculate annual stats
  const annualStats = useMemo(() => {
    const statsMap: { [year: number]: { total: number; average: number } } = {};

    uniqueYears.forEach((year) => {
      let sum = 0;
      let count = 0;
      for (let m = 1; m <= 12; m++) {
        const val = balanceMap[year]?.[m] ?? 0;
        sum += val;
        if (val !== 0) count++;
      }
      statsMap[year] = {
        total: sum,
        average: count > 0 ? sum / 12 : 0,
      };
    });

    return statsMap;
  }, [uniqueYears, balanceMap]);

  const { formatCurrency } = useFormatCurrency();

  // Styles
  const containerStyle = css({
    width: "100%",
    overflowX: "auto",
  });

  const chartContainerStyle = css({
    height: "350px",
    width: "100%",
    paddingTop: "16px",
  });

  const tableStyle = css({
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "8px",
    fontSize: "sm",
  });

  const thStyle = css({
    padding: "16px",
    fontWeight: "bold",
    textAlign: "right",
    borderBottom: "2px solid",
    borderBottomColor: "border",
    color: "text.primary",
    verticalAlign: "middle",
    "&:first-child": {
      textAlign: "left",
      width: "160px",
    },
  });

  const tdStyle = css({
    padding: "12px 16px",
    borderBottom: "1px solid",
    borderBottomColor: "border",
    textAlign: "right",
    verticalAlign: "middle",
    "&:first-child": {
      textAlign: "left",
      fontWeight: "semibold",
      color: "text.primary",
    },
  });

  const inputStyle = css({
    width: "100%",
    maxWidth: "140px",
    padding: "8px 12px",
    borderRadius: "sm",
    border: "1px solid",
    borderColor: "border",
    textAlign: "right",
    fontSize: "sm",
    backgroundColor: "background",
    color: "text.primary",
    "&:focus": {
      borderColor: "primary",
      outline: "none",
      boxShadow: "0 0 0 2px rgba(99, 99, 241, 0.15)",
    },
  });

  const footerRowStyle = css({
    backgroundColor: "surface",
    fontWeight: "bold",
    borderTop: "2px solid",
    borderTopColor: "border",
    "& td": {
      color: "text.primary",
      padding: "16px",
    },
  });

  const deleteBtnStyle = css({
    color: "destructive",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "md",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "8px",
    transition: "background 0.2s",
    "&:hover": {
      backgroundColor: "rgba(239, 68, 68, 0.08)",
    },
  });

  const changeStyle = (isUp: boolean, isZero: boolean) =>
    css({
      fontSize: "10px",
      display: "block",
      marginTop: "4px",
      fontWeight: "medium",
      color: isZero ? "text.muted" : isUp ? "success.500" : "destructive",
    });

  if (!accountDetails || accountDetails.length === 0) {
    return (
      <div style={{ padding: "48px", textAlign: "center" }}>
        <FLPText color="text.muted">
          No balance records found. Add a year below to begin entering values.
        </FLPText>
      </div>
    );
  }

  // Render Chart Tab
  if (activeTab === "chart" && !isEditMode) {
    return (
      <div className={chartContainerStyle}>
        {sortedDetails.length > 0 ? (
          <AccountDetailChart accountDetails={sortedDetails} showAxes={true} />
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <FLPText color="text.muted">Not enough data to render trend chart.</FLPText>
          </div>
        )}
      </div>
    );
  }

  // Render Table / Edit Tab
  return (
    <div className={containerStyle}>
      <table className={tableStyle}>
        <thead>
          <tr>
            <th className={thStyle}>Month</th>
            {uniqueYears.map((year: number) => (
              <th key={year} className={thStyle}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: "8px",
                  }}
                >
                  <span>{year}</span>
                  {!isEditMode && (
                    <button
                      className={deleteBtnStyle}
                      title={`Delete ${year}`}
                      type="button"
                      onClick={() => onRemoveYear(year)}
                    >
                      <FaTrashAlt size={12} style={{ marginRight: "4px" }} />
                      {t("deleteYear")}
                    </button>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {months.map((month) => (
            <tr key={month}>
              <td className={tdStyle}>{getMonthName(month)}</td>
              {uniqueYears.map((year: number) => {
                const detail = accountDetails.find(
                  (d: any) => d.month === month && d.year === year,
                );
                const value = detail?.value ?? 0;
                const changeInfo = changeMap[year]?.[month];

                return (
                  <td key={`${year}-${month}`} className={tdStyle}>
                    {isEditMode ? (
                      <input
                        className={inputStyle}
                        data-month={month}
                        data-year={year}
                        type="number"
                        step="any"
                        value={editedValues?.[year]?.[month] ?? value}
                        onChange={onInputChange}
                      />
                    ) : (
                      <>
                        <span>{formatCurrency(value)}</span>
                        {changeInfo?.hasPrev && (
                          <span
                            className={changeStyle(changeInfo.change >= 0, changeInfo.change === 0)}
                          >
                            {formatCurrency(changeInfo.change, {
                              signDisplay: "always",
                            })}{" "}
                            ({changeInfo.percent}%)
                          </span>
                        )}
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          {/* Annual Total */}
          <tr className={footerRowStyle}>
            <td className={tdStyle}>Annual Total</td>
            {uniqueYears.map((year: number) => (
              <td key={`total-${year}`} className={tdStyle}>
                {formatCurrency(annualStats[year]?.total ?? 0)}
              </td>
            ))}
          </tr>
          {/* Annual Average */}
          <tr className={footerRowStyle}>
            <td className={tdStyle}>Monthly Average</td>
            {uniqueYears.map((year: number) => (
              <td key={`average-${year}`} className={tdStyle}>
                {formatCurrency(annualStats[year]?.average ?? 0)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default AccountDetails;
