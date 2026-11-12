import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { NotSet } from "~/features/feedback/components/NotSet";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { DashboardWidgetCard } from "../DashboardWidgetCard";
import { WidgetSettingsModal } from "../WidgetSettingsModal";

export interface ForecastWidgetConfig {
  forecastYears?: 5 | 10 | 20;
  expectedAnnualReturnRate?: number;
}

export interface ForecastWidgetProps {
  data: {
    totalAssets: number;
    monthlySavingRate: number;
    annualSalary: number | null;
    estimatedTakeHome: number | null;
    /** What to add when take-home cannot be computed although a salary exists. */
    takeHomeMissing?: string;
  };
  editMode: boolean;
  size: "normal" | "wide";
  config?: ForecastWidgetConfig;
  onUpdateConfig?: (config: ForecastWidgetConfig) => void;
  onToggleSize?: () => void;
  onHide?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  dragProps?: any;
}

export const ForecastWidget: FC<ForecastWidgetProps> = ({
  data,
  editMode,
  size,
  config = {},
  onUpdateConfig,
  onToggleSize,
  onHide,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  dragProps,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const forecastYears = config.forecastYears || 10;
  const growthRate = config.expectedAnnualReturnRate ?? 6.0;

  // Compound future value projection:
  const r = growthRate / 100 / 12;
  const n = forecastYears * 12;
  const p = data.totalAssets;
  const pmt = data.monthlySavingRate;

  let futureWealth = p;
  if (r > 0) {
    futureWealth = p * (1 + r) ** n + pmt * (((1 + r) ** n - 1) / r);
  } else {
    futureWealth = p + pmt * n;
  }

  return (
    <DashboardWidgetCard
      dragProps={dragProps}
      editMode={editMode}
      isFirst={isFirst}
      isLast={isLast}
      size={size}
      widgetKey="forecast"
      onHide={onHide}
      onMoveDown={onMoveDown}
      onMoveUp={onMoveUp}
      onToggleSize={onToggleSize}
      renderSettings={(isOpen, onClose) => (
        <WidgetSettingsModal
          description="Customise the multi-year wealth projection time horizon and growth assumptions."
          isOpen={isOpen}
          title="Forecast Widget Settings"
          onClose={onClose}
        >
          <div>
            <span
              className={css({ fontSize: "sm", fontWeight: "semibold", display: "block", mb: 2 })}
            >
              Forecast Horizon
            </span>
            <div className={css({ display: "flex", gap: "8px" })}>
              {([5, 10, 20] as const).map((years) => (
                <button
                  key={years}
                  type="button"
                  className={css({
                    flex: 1,
                    padding: "8px",
                    borderRadius: "md",
                    border: "1px solid",
                    borderColor: forecastYears === years ? "primary" : "border",
                    backgroundColor: forecastYears === years ? "rgba(99,99,241,0.08)" : "surface",
                    cursor: "pointer",
                    fontSize: "xs",
                    fontWeight: "medium",
                  })}
                  onClick={() => onUpdateConfig?.({ ...config, forecastYears: years })}
                >
                  {years} Years
                </button>
              ))}
            </div>
          </div>

          <div>
            <span
              className={css({ fontSize: "sm", fontWeight: "semibold", display: "block", mb: 2 })}
            >
              Assumed Annual Return
            </span>
            <div className={css({ display: "flex", gap: "8px" })}>
              {[
                { label: "Conservative (4%)", rate: 4.0 },
                { label: "Balanced (6%)", rate: 6.0 },
                { label: "Growth (8%)", rate: 8.0 },
              ].map(({ label, rate }) => (
                <button
                  key={rate}
                  type="button"
                  className={css({
                    flex: 1,
                    padding: "8px",
                    borderRadius: "md",
                    border: "1px solid",
                    borderColor: growthRate === rate ? "primary" : "border",
                    backgroundColor: growthRate === rate ? "rgba(99,99,241,0.08)" : "surface",
                    cursor: "pointer",
                    fontSize: "xs",
                    fontWeight: "medium",
                  })}
                  onClick={() => onUpdateConfig?.({ ...config, expectedAnnualReturnRate: rate })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </WidgetSettingsModal>
      )}
    >
      <div
        className={css({
          display: "flex",
          flexDirection: "column",
          gap: { base: "10px", md: "14px" },
        })}
      >
        <div
          className={css({
            display: "flex",
            flexDirection: { base: "column", sm: size === "wide" ? "row" : "column", md: "row" },
            justifyContent: "space-between",
            alignItems: {
              base: "flex-start",
              sm: size === "wide" ? "flex-end" : "flex-start",
              md: "flex-end",
            },
            gap: { base: "6px", md: "12px" },
          })}
        >
          <div>
            <FLPText
              color="text.muted"
              fontSize="10px"
              fontWeight="semibold"
              textTransform="uppercase"
            >
              {forecastYears}yr Wealth Projection
            </FLPText>
            <FLPHeading
              as="h2"
              color="text.primary"
              className={css({
                fontSize: { base: "lg", sm: "xl", md: "2xl" },
                lineHeight: "tight",
              })}
            >
              {formatCurrency(futureWealth)}
            </FLPHeading>
          </div>
          <div
            className={css({
              textAlign: { base: "left", sm: size === "wide" ? "right" : "left", md: "right" },
            })}
          >
            <FLPText color="text.muted" fontSize="10px">
              Saving: <strong>+{formatCurrency(data.monthlySavingRate)}/mo</strong>
            </FLPText>
            <FLPText color="text.muted" fontSize="10px" style={{ marginTop: "1px" }}>
              Growth: <strong>{growthRate}% /yr</strong>
            </FLPText>
          </div>
        </div>

        <div
          className={css({
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: { base: "6px 10px", md: "10px 14px" },
            borderRadius: "lg",
            backgroundColor: "surface.sunken",
            border: "1px solid",
            borderColor: "border.subtle",
            fontSize: { base: "10px", md: "xs" },
            gap: "6px",
          })}
        >
          <div>
            <span style={{ color: "var(--colors-text-muted)" }}>Take-Home:</span>{" "}
            {data.estimatedTakeHome ? (
              <strong className={css({ fontVariantNumeric: "tabular-nums" })}>
                {formatCurrency(data.estimatedTakeHome)}/mo
              </strong>
            ) : (
              <NotSet
                href="/app/profile"
                label={data.takeHomeMissing ?? "Not set"}
                subject="take-home details"
              />
            )}
          </div>
          <div style={{ color: "var(--colors-primary)", fontWeight: 600 }}>Runway →</div>
        </div>
      </div>
    </DashboardWidgetCard>
  );
};
