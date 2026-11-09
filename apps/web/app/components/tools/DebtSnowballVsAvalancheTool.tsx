import { compareAvalancheAndSnowball, type DebtItem } from "@repo/common";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo, useState } from "react";
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

export const DebtSnowballVsAvalancheTool: FC = () => {
  const [cardBalance, setCardBalance] = useState<number>(3500);
  const [cardApr, setCardApr] = useState<number>(24.9);
  const [cardMin, setCardMin] = useState<number>(90);

  const [loanBalance, setLoanBalance] = useState<number>(5000);
  const [loanApr, setLoanApr] = useState<number>(8.5);
  const [loanMin, setLoanMin] = useState<number>(140);

  const [extraPayment, setExtraPayment] = useState<number>(75);

  const debts = useMemo<DebtItem[]>(() => {
    return [
      {
        id: "d1",
        name: "Credit Card",
        balance: cardBalance,
        apr: cardApr,
        minimumPayment: cardMin,
        type: "credit_card",
      },
      {
        id: "d2",
        name: "Personal Loan",
        balance: loanBalance,
        apr: loanApr,
        minimumPayment: loanMin,
        type: "loan",
      },
    ];
  }, [cardBalance, cardApr, cardMin, loanBalance, loanApr, loanMin]);

  const comparison = useMemo(() => {
    return compareAvalancheAndSnowball(debts, extraPayment);
  }, [debts, extraPayment]);

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
            Debt payoff: snowball vs avalanche calculator
          </FLPHeading>
          <FLPText color="text.muted" fontSize="sm">
            Model exact interest savings and exit dates between mathematically optimal (avalanche)
            and psychological momentum (snowball).
          </FLPText>
        </div>
      </div>

      <div className={gridStyle}>
        <div>
          <div
            style={{
              padding: "14px",
              backgroundColor: "rgba(99,99,241,0.05)",
              borderRadius: "10px",
              marginBottom: "16px",
            }}
          >
            <FLPText fontSize="sm" fontWeight="bold">
              Liability 1: Credit card
            </FLPText>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "10px",
                marginTop: "8px",
              }}
            >
              <div className={inputGroupStyle}>
                <FLPText fontSize="xs">Balance (£)</FLPText>
                <input
                  aria-label="Credit card balance"
                  className={textInputStyle}
                  type="number"
                  value={cardBalance}
                  onChange={(e) => setCardBalance(Number(e.target.value) || 0)}
                />
              </div>
              <div className={inputGroupStyle}>
                <FLPText fontSize="xs">APR (%)</FLPText>
                <input
                  aria-label="Credit card APR"
                  className={textInputStyle}
                  step="0.1"
                  type="number"
                  value={cardApr}
                  onChange={(e) => setCardApr(Number(e.target.value) || 0)}
                />
              </div>
              <div className={inputGroupStyle}>
                <FLPText fontSize="xs">Min / mo (£)</FLPText>
                <input
                  aria-label="Credit card minimum payment"
                  className={textInputStyle}
                  type="number"
                  value={cardMin}
                  onChange={(e) => setCardMin(Number(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "14px",
              backgroundColor: "rgba(16,185,129,0.05)",
              borderRadius: "10px",
              marginBottom: "16px",
            }}
          >
            <FLPText fontSize="sm" fontWeight="bold">
              Liability 2: Personal loan
            </FLPText>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "10px",
                marginTop: "8px",
              }}
            >
              <div className={inputGroupStyle}>
                <FLPText fontSize="xs">Balance (£)</FLPText>
                <input
                  aria-label="Personal loan balance"
                  className={textInputStyle}
                  type="number"
                  value={loanBalance}
                  onChange={(e) => setLoanBalance(Number(e.target.value) || 0)}
                />
              </div>
              <div className={inputGroupStyle}>
                <FLPText fontSize="xs">APR (%)</FLPText>
                <input
                  aria-label="Personal loan APR"
                  className={textInputStyle}
                  step="0.1"
                  type="number"
                  value={loanApr}
                  onChange={(e) => setLoanApr(Number(e.target.value) || 0)}
                />
              </div>
              <div className={inputGroupStyle}>
                <FLPText fontSize="xs">Min / mo (£)</FLPText>
                <input
                  aria-label="Personal loan minimum payment"
                  className={textInputStyle}
                  type="number"
                  value={loanMin}
                  onChange={(e) => setLoanMin(Number(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <div className={inputGroupStyle}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <FLPText fontSize="sm" fontWeight="bold">
                Monthly overpayment surplus
              </FLPText>
              <FLPText color="primary" fontSize="sm" fontWeight="bold">
                +£{extraPayment}/mo
              </FLPText>
            </div>
            <input
              aria-label="Monthly overpayment surplus"
              max={500}
              min={0}
              step={10}
              style={{ width: "100%", accentColor: "var(--colors-primary)" }}
              type="range"
              value={extraPayment}
              onChange={(e) => setExtraPayment(Number(e.target.value))}
            />
          </div>
        </div>

        <div className={resultsBoxStyle}>
          <div>
            <span
              style={{
                fontSize: "11px",
                backgroundColor: "#fef3c7",
                color: "#b45309",
                padding: "2px 8px",
                borderRadius: "4px",
                fontWeight: "bold",
              }}
            >
              ⚡ Avalanche strategy (highest APR first)
            </span>
            <div
              style={{ fontSize: "24px", fontWeight: "bold", color: "#10b981", marginTop: "4px" }}
            >
              Debt free: {comparison.avalanche.debtFreeDate}
            </div>
            <FLPText color="text.muted" fontSize="xs">
              {comparison.avalanche.months} months total • Shaves{" "}
              {comparison.monthsShavedAvalancheVsMin} months off minimum payments
            </FLPText>
          </div>

          <div
            style={{
              padding: "12px",
              backgroundColor: "surface",
              borderRadius: "8px",
              border: "1px solid var(--colors-border)",
            }}
          >
            <FLPText color="text.muted" fontSize="xs">
              Total interest saved vs minimum payments:
            </FLPText>
            <div
              style={{ fontSize: "20px", fontWeight: "bold", color: "#ef4444", marginTop: "2px" }}
            >
              £{Math.round(comparison.interestSavedAvalancheVsMin).toLocaleString()}
            </div>
          </div>

          <div>
            <span
              style={{
                fontSize: "11px",
                backgroundColor: "#dbeafe",
                color: "#1e40af",
                padding: "2px 8px",
                borderRadius: "4px",
                fontWeight: "bold",
              }}
            >
              ❄️ Snowball strategy (smallest balance first)
            </span>
            <div style={{ fontSize: "18px", fontWeight: "bold", marginTop: "4px" }}>
              {comparison.snowballFirstWinDescription}
            </div>
            <FLPText color="text.muted" fontSize="xs">
              Full payoff in {comparison.snowball.months} months (Total interest: £
              {Math.round(comparison.snowball.totalInterest).toLocaleString()})
            </FLPText>
          </div>

          <RouterLink style={{ textDecoration: "none" }} to="/signUp">
            <FLPButton size="md" variant="primary" style={{ width: "100%" }}>
              Track live in Flump free →
            </FLPButton>
          </RouterLink>
        </div>
      </div>
    </div>
  );
};

export default DebtSnowballVsAvalancheTool;
