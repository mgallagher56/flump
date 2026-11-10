import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FaCoins, FaPercent, FaPiggyBank, FaRocket } from "react-icons/fa";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useResponsive } from "~/context/ResponsiveContext";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";

export interface SavingsSummaryCardsProps {
  totalSavingsBalance: number;
  totalMonthlySavings: number;
  weightedInterestRate: number;
  projectedTenYearBalance: number;
  accountCount: number;
  allocationMode?: "total" | "per_account";
  estimatedAnnualInterest?: number;
  monthlyTakeHome?: number | null;
  isMobile?: boolean;
  variant?: "desktop" | "mobile";
}

const gridStyle = (isMobile?: boolean) =>
  css({
    display: "grid",
    gridTemplateColumns: isMobile
      ? "repeat(2, 1fr)"
      : {
          base: "1fr",
          sm: "repeat(2, 1fr)",
          lg: "repeat(4, 1fr)",
        },
    gap: isMobile ? "10px" : "16px",
  });

const cardStyle = (isMobile?: boolean) =>
  css({
    padding: isMobile ? "14px" : "20px",
    display: "flex",
    flexDirection: "column",
    gap: isMobile ? "8px" : "12px",
    borderRadius: "xl",
    border: "1px solid",
    borderColor: "border",
    backgroundColor: "surface",
    boxShadow: "sm",
    transition: "transform 0.2s, box-shadow 0.2s",
    _hover: {
      transform: "translateY(-2px)",
      boxShadow: "md",
    },
  });

const headerRowStyle = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
});

const iconContainerStyle = (color: string, bg: string) =>
  css({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "40px",
    height: "40px",
    borderRadius: "lg",
    backgroundColor: bg,
    color: color,
    fontSize: "18px",
  });

export const SavingsSummaryCards: FC<SavingsSummaryCardsProps> = ({
  totalSavingsBalance,
  totalMonthlySavings,
  weightedInterestRate,
  projectedTenYearBalance,
  accountCount,
  estimatedAnnualInterest,
  monthlyTakeHome,
  isMobile: propIsMobile,
  variant = "desktop",
}) => {
  const { formatCurrency } = useFormatCurrency();
  const { isMobile: contextIsMobile } = useResponsive();
  const isMobileVariant = propIsMobile ?? (variant === "mobile" ? true : contextIsMobile);

  const safeWeightedRate = Number(weightedInterestRate) || 0;

  // Calculate 12-month compound interest including monthly contributions
  const monthlyRate = safeWeightedRate / 100 / 12;
  let balAfterOneYear = totalSavingsBalance;
  for (let m = 0; m < 12; m++) {
    balAfterOneYear = balAfterOneYear * (1 + monthlyRate) + totalMonthlySavings;
  }
  const compoundOneYearInterest = Math.max(
    0,
    balAfterOneYear - totalSavingsBalance - totalMonthlySavings * 12,
  );
  const displayAnnualInterest =
    estimatedAnnualInterest !== undefined ? estimatedAnnualInterest : compoundOneYearInterest;

  const numTakeHome = Number(monthlyTakeHome) || 0;
  const savingsRate =
    numTakeHome > 0 && totalMonthlySavings > 0
      ? ((totalMonthlySavings / numTakeHome) * 100).toFixed(1)
      : null;

  return (
    <div
      className={gridStyle(isMobileVariant)}
      data-variant={isMobileVariant ? "mobile" : "desktop"}
    >
      <FLPCard className={cardStyle(isMobileVariant)} isMobile={isMobileVariant}>
        <div className={headerRowStyle}>
          <FLPText color="text.muted" fontSize="sm" fontWeight="medium">
            Total Savings Balance
          </FLPText>
          <div className={iconContainerStyle("#10b981", "rgba(16, 185, 129, 0.12)")}>
            <FaPiggyBank />
          </div>
        </div>
        <div>
          <FLPHeading
            as="h3"
            className="tabular-nums"
            isMobile={isMobileVariant}
            size="lg"
            style={{ color: "var(--colors-text-primary)" }}
          >
            {formatCurrency(totalSavingsBalance)}
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
            Across {accountCount} savings & investment account{accountCount === 1 ? "" : "s"}
          </FLPText>
        </div>
      </FLPCard>

      <FLPCard className={cardStyle(isMobileVariant)} isMobile={isMobileVariant}>
        <div className={headerRowStyle}>
          <FLPText color="text.muted" fontSize="sm" fontWeight="medium">
            Monthly Savings
          </FLPText>
          <div className={iconContainerStyle("#6363f1", "rgba(99, 99, 241, 0.12)")}>
            <FaCoins />
          </div>
        </div>
        <div>
          <FLPHeading
            as="h3"
            className="tabular-nums"
            isMobile={isMobileVariant}
            size="lg"
            style={{ color: "var(--colors-text-primary)" }}
          >
            {formatCurrency(totalMonthlySavings)}
            <span
              style={{ fontSize: "14px", fontWeight: "normal", color: "var(--colors-text-muted)" }}
            >
              /mo
            </span>
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
            {savingsRate ? (
              <>
                <span style={{ color: "#10b981", fontWeight: 600 }}>{savingsRate}%</span> of
                take-home pay
              </>
            ) : (
              "Total scheduled across accounts"
            )}
          </FLPText>
        </div>
      </FLPCard>

      <FLPCard className={cardStyle(isMobileVariant)} isMobile={isMobileVariant}>
        <div className={headerRowStyle}>
          <FLPText color="text.muted" fontSize="sm" fontWeight="medium">
            Portfolio weighted AER
          </FLPText>
          <div className={iconContainerStyle("#f59e0b", "rgba(245, 158, 11, 0.12)")}>
            <FaPercent />
          </div>
        </div>
        <div>
          <FLPHeading
            as="h3"
            className="tabular-nums"
            isMobile={isMobileVariant}
            size="lg"
            style={{ color: "var(--colors-text-primary)" }}
          >
            {safeWeightedRate.toFixed(2)}%
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
            ~{formatCurrency(Math.round(displayAnnualInterest))} annual interest earned
          </FLPText>
        </div>
      </FLPCard>

      <FLPCard className={cardStyle(isMobileVariant)} isMobile={isMobileVariant}>
        <div className={headerRowStyle}>
          <FLPText color="text.muted" fontSize="sm" fontWeight="medium">
            10-Year Growth
          </FLPText>
          <div className={iconContainerStyle("#8b5cf6", "rgba(139, 92, 246, 0.12)")}>
            <FaRocket />
          </div>
        </div>
        <div>
          <FLPHeading
            as="h3"
            className="tabular-nums"
            isMobile={isMobileVariant}
            size="lg"
            style={{ color: "var(--colors-text-primary)" }}
          >
            {formatCurrency(Math.round(projectedTenYearBalance))}
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
            Forecast with current regular contributions and AER
          </FLPText>
        </div>
      </FLPCard>
    </div>
  );
};

export default SavingsSummaryCards;
