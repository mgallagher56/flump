import { calculateZeroPercentCliff } from "@repo/common";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo, useState } from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import { Link as RouterLink } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";

const cardStyle = css({
  backgroundColor: "surface",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  padding: { base: "20px", md: "32px" },
  display: "flex",
  flexDirection: "column",
  gap: "24px",
  boxShadow: "sm",
});

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", lg: "1.1fr 0.9fr" },
  gap: "32px",
});

const inputGroupStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginBottom: "16px",
});

const textInputStyle = css({
  padding: "10px 14px",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "background",
  color: "text.primary",
  fontSize: "15px",
});

const resultsBoxStyle = css({
  backgroundColor: "background",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "xl",
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  gap: "18px",
});

export const ZeroPercentCliffTool: FC = () => {
  const [balance, setBalance] = useState<number>(3600);
  const [months, setMonths] = useState<number>(18);
  const [revertApr, setRevertApr] = useState<number>(24.9);

  const cliff = useMemo(() => {
    return calculateZeroPercentCliff(balance, months, revertApr);
  }, [balance, months, revertApr]);

  return (
    <div className={cardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <FLPHeading as="h3" size="xl">
            0% balance transfer promotional expiry calculator
          </FLPHeading>
          <FLPText color="text.muted" fontSize="sm">
            Calculate the exact monthly repayment needed to clear your card before the 0%
            promotional window expires.
          </FLPText>
        </div>
      </div>

      <div className={gridStyle}>
        <div>
          <div className={inputGroupStyle}>
            <FLPText fontSize="sm" fontWeight="bold">
              Current 0% card balance (£)
            </FLPText>
            <input
              aria-label="0% card balance"
              className={textInputStyle}
              min={100}
              type="number"
              value={balance}
              onChange={(e) => setBalance(Number(e.target.value) || 0)}
            />
          </div>

          <div className={inputGroupStyle}>
            <FLPText fontSize="sm" fontWeight="bold">
              Months remaining on 0% offer
            </FLPText>
            <input
              aria-label="Months remaining on 0% offer"
              className={textInputStyle}
              max={48}
              min={1}
              type="number"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value) || 1)}
            />
          </div>

          <div className={inputGroupStyle}>
            <FLPText fontSize="sm" fontWeight="bold">
              Revert APR after offer ends (%)
            </FLPText>
            <input
              aria-label="Revert APR"
              className={textInputStyle}
              step="0.1"
              type="number"
              value={revertApr}
              onChange={(e) => setRevertApr(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className={resultsBoxStyle}>
          <div>
            <span
              style={{
                fontSize: "11px",
                backgroundColor: "#d1fae5",
                color: "#065f46",
                padding: "2px 8px",
                borderRadius: "4px",
                fontWeight: "bold",
              }}
            >
              Target monthly payment
            </span>
            <div
              style={{ fontSize: "28px", fontWeight: "bold", color: "#10b981", marginTop: "4px" }}
            >
              £{Math.round(cliff.requiredMonthlyPayment)} / month
            </div>
            <FLPText color="text.muted" fontSize="xs">
              Clears the entire £{balance.toLocaleString()} balance across {months} months without
              paying £1 in interest.
            </FLPText>
          </div>

          <div
            style={{
              padding: "14px",
              backgroundColor: "#fef2f2",
              borderRadius: "10px",
              border: "1px solid #fecaca",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#991b1b" }}>
              <FaExclamationTriangle size={16} />
              <strong style={{ fontSize: "13px" }}>Revert APR alert</strong>
            </div>
            <FLPText color="#7f1d1d" fontSize="xs" style={{ marginTop: "4px" }}>
              If you pay only minimums, you will reach the {revertApr}% revert date with ~£
              {Math.round(cliff.balanceRemainingIfMinimum).toLocaleString()} unpaid, costing £
              {Math.round(cliff.penaltyInterestFirstYearIfUnpaid).toLocaleString()} in first-year
              interest.
            </FLPText>
          </div>

          <RouterLink style={{ textDecoration: "none" }} to="/signUp">
            <FLPButton size="md" variant="primary" style={{ width: "100%" }}>
              Track 0% expiry dates in Flump free →
            </FLPButton>
          </RouterLink>
        </div>
      </div>
    </div>
  );
};

export default ZeroPercentCliffTool;
