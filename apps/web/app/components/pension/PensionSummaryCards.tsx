import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FaBuilding, FaCoins, FaPiggyBank, FaUser } from "react-icons/fa";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useResponsive } from "~/context/ResponsiveContext";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";

export interface PensionSummaryCardsProps {
  totalValue: number;
  potsCount: number;
  employeePercent: number;
  employerPercent: number;
  monthlyEmployeeContrib: number;
  monthlyEmployerContrib: number;
  monthlyEmployerNiContrib?: number;
  directMonthlyContrib?: number;
  netMonthlyCost?: number;
  taxReliefMonthly?: number;
  weightedReturnRate?: number;
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
    borderRadius: "xl",
    border: "1px solid",
    borderColor: "border",
    backgroundColor: "surface",
    display: "flex",
    flexDirection: "column",
    gap: isMobile ? "8px" : "12px",
    boxShadow: "sm",
    transition: "all 0.2s ease",
    _hover: {
      borderColor: "primary",
      transform: "translateY(-2px)",
      boxShadow: "md",
    },
  });

const iconWrapperStyle = (bg: string, color: string) =>
  css({
    width: "40px",
    height: "40px",
    borderRadius: "lg",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: bg,
    color: color,
    fontSize: "18px",
    flexShrink: 0,
  });

export const PensionSummaryCards: FC<PensionSummaryCardsProps> = ({
  totalValue,
  potsCount,
  employeePercent,
  employerPercent,
  monthlyEmployeeContrib,
  monthlyEmployerContrib,
  monthlyEmployerNiContrib = 0,
  directMonthlyContrib = 0,
  netMonthlyCost,
  taxReliefMonthly,
  weightedReturnRate,
  isMobile: propIsMobile,
  variant = "desktop",
}) => {
  const { formatCurrency } = useFormatCurrency();
  const { isMobile: contextIsMobile } = useResponsive();
  const isMobileVariant = propIsMobile ?? (variant === "mobile" ? true : contextIsMobile);
  const totalMonthlyContrib =
    monthlyEmployeeContrib + monthlyEmployerContrib + directMonthlyContrib;
  const totalAnnualContrib = totalMonthlyContrib * 12;

  return (
    <div
      className={gridStyle(isMobileVariant)}
      data-variant={isMobileVariant ? "mobile" : "desktop"}
    >
      {/* 1. Total Pension Value */}
      <FLPCard className={cardStyle(isMobileVariant)} isMobile={isMobileVariant}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <FLPText color="text.muted" fontSize="xs" fontWeight="semibold" textTransform="uppercase">
            Total Pension Wealth
          </FLPText>
          <div className={iconWrapperStyle("rgba(139, 92, 246, 0.12)", "#8b5cf6")}>
            <FaPiggyBank />
          </div>
        </div>
        <div>
          <FLPHeading as="h3" isMobile={isMobileVariant} size="lg" style={{ color: "#8b5cf6" }}>
            {formatCurrency(totalValue)}
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
            Across {potsCount} {potsCount === 1 ? "pension pot" : "pension pots"}
            {weightedReturnRate !== undefined && potsCount > 0
              ? ` · ${weightedReturnRate.toFixed(1)}% avg return`
              : ""}
          </FLPText>
        </div>
      </FLPCard>

      {/* 2. Total Monthly Contributions */}
      <FLPCard className={cardStyle(isMobileVariant)} isMobile={isMobileVariant}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <FLPText color="text.muted" fontSize="xs" fontWeight="semibold" textTransform="uppercase">
            Total Monthly Inflow
          </FLPText>
          <div className={iconWrapperStyle("rgba(16, 185, 129, 0.12)", "#10b981")}>
            <FaCoins />
          </div>
        </div>
        <div>
          <FLPHeading as="h3" isMobile={isMobileVariant} size="lg" style={{ color: "#10b981" }}>
            {formatCurrency(totalMonthlyContrib)}
            <span
              style={{ fontSize: "14px", fontWeight: "normal", color: "var(--colors-text-muted)" }}
            >
              /mo
            </span>
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
            {formatCurrency(totalAnnualContrib)}/year (
            {(employeePercent + employerPercent).toFixed(1)}%
            {directMonthlyContrib > 0
              ? ` + ${formatCurrency(directMonthlyContrib)} direct`
              : " total"}
            )
          </FLPText>
        </div>
      </FLPCard>

      {/* 3. Employee Contribution */}
      <FLPCard className={cardStyle(isMobileVariant)} isMobile={isMobileVariant}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <FLPText color="text.muted" fontSize="xs" fontWeight="semibold" textTransform="uppercase">
            Employee ({employeePercent.toFixed(1)}%)
          </FLPText>
          <div className={iconWrapperStyle("rgba(99, 99, 241, 0.12)", "#6363f1")}>
            <FaUser />
          </div>
        </div>
        <div>
          <FLPHeading as="h3" isMobile={isMobileVariant} size="lg">
            {formatCurrency(monthlyEmployeeContrib)}
            <span
              style={{ fontSize: "14px", fontWeight: "normal", color: "var(--colors-text-muted)" }}
            >
              /mo
            </span>
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
            {netMonthlyCost !== undefined && taxReliefMonthly !== undefined && taxReliefMonthly > 0
              ? `Net cost: ${formatCurrency(netMonthlyCost)}/mo (${formatCurrency(taxReliefMonthly)} tax relief)`
              : `${formatCurrency(monthlyEmployeeContrib * 12)}/year from your salary`}
          </FLPText>
        </div>
      </FLPCard>

      {/* 4. Employer Contribution */}
      <FLPCard className={cardStyle(isMobileVariant)} isMobile={isMobileVariant}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <FLPText color="text.muted" fontSize="xs" fontWeight="semibold" textTransform="uppercase">
            Employer ({employerPercent.toFixed(1)}%)
          </FLPText>
          <div className={iconWrapperStyle("rgba(245, 158, 11, 0.12)", "#f59e0b")}>
            <FaBuilding />
          </div>
        </div>
        <div>
          <FLPHeading as="h3" isMobile={isMobileVariant} size="lg">
            {formatCurrency(monthlyEmployerContrib)}
            <span
              style={{ fontSize: "14px", fontWeight: "normal", color: "var(--colors-text-muted)" }}
            >
              /mo
            </span>
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
            {monthlyEmployerNiContrib > 0
              ? `${formatCurrency(monthlyEmployerContrib * 12)}/year (incl. ${formatCurrency(monthlyEmployerNiContrib)}/mo employer NI)`
              : `${formatCurrency(monthlyEmployerContrib * 12)}/year paid by your employer`}
          </FLPText>
        </div>
      </FLPCard>
    </div>
  );
};

export default PensionSummaryCards;
