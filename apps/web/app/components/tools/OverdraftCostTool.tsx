import { calculateOverdraftCost } from "@repo/common";
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

export const OverdraftCostTool: FC = () => {
  const [balance, setBalance] = useState<number>(1200);
  const [earRate, setEarRate] = useState<number>(39.9);

  const cost = useMemo(() => {
    return calculateOverdraftCost(balance, earRate);
  }, [balance, earRate]);

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
            UK Arranged Overdraft Cost & EAR Calculator
          </FLPHeading>
          <FLPText color="text.muted" fontSize="sm">
            UK banks charge effective rates approaching 40% EAR on arranged overdrafts. Calculate
            your stealth annual fee.
          </FLPText>
        </div>
      </div>

      <div className={gridStyle}>
        <div>
          <div className={inputGroupStyle}>
            <FLPText fontSize="sm" fontWeight="bold">
              Average Overdraft Balance Used (£)
            </FLPText>
            <input
              aria-label="Overdraft Balance"
              className={textInputStyle}
              min={50}
              type="number"
              value={balance}
              onChange={(e) => setBalance(Number(e.target.value) || 0)}
            />
          </div>

          <div className={inputGroupStyle}>
            <FLPText fontSize="sm" fontWeight="bold">
              Bank EAR Rate (%) (UK standard is ~39.9%)
            </FLPText>
            <input
              aria-label="Bank EAR Rate"
              className={textInputStyle}
              step="0.1"
              type="number"
              value={earRate}
              onChange={(e) => setEarRate(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className={resultsBoxStyle}>
          <div>
            <span
              style={{
                fontSize: "11px",
                backgroundColor: "#fee2e2",
                color: "#991b1b",
                padding: "2px 8px",
                borderRadius: "4px",
                fontWeight: "bold",
              }}
            >
              Annual Stealth Bank Cost
            </span>
            <div
              style={{ fontSize: "30px", fontWeight: "800", color: "#ef4444", marginTop: "4px" }}
            >
              £{Math.round(cost.annualPoundCost).toLocaleString()} / year
            </div>
            <FLPText color="text.muted" fontSize="xs">
              Directly debited as ~£{cost.monthlyPoundCost.toFixed(2)}/month from your regular
              checking balance.
            </FLPText>
          </div>

          <div
            style={{
              padding: "14px",
              backgroundColor: "surface",
              borderRadius: "10px",
              border: "1px solid var(--colors-border)",
            }}
          >
            <FLPText fontSize="xs" fontWeight="bold">
              💡 Why Overdrafts Are Dangerous
            </FLPText>
            <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
              Because there is no fixed repayment date or separate statement, persistent overdrafts
              act as an indefinite 40% APR revolving charge. Clearing a £1,200 overdraft delivers an
              immediate guaranteed 39.9% tax-free return on your money!
            </FLPText>
          </div>

          <RouterLink style={{ textDecoration: "none" }} to="/signUp">
            <FLPButton size="md" variant="primary" style={{ width: "100%" }}>
              Eliminate Your Overdraft with Flump →
            </FLPButton>
          </RouterLink>
        </div>
      </div>
    </div>
  );
};

export default OverdraftCostTool;
