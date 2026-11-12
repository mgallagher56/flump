import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { NotSet } from "~/features/feedback/components/NotSet";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { DashboardWidgetCard } from "../DashboardWidgetCard";
import { WidgetSettingsModal } from "../WidgetSettingsModal";

export interface TaxWidgetConfig {
  metricMode?: "taxDue" | "netProfit";
  filterSource?: "all" | "rental" | "self-employed";
}

export interface TaxWidgetProps {
  data: {
    taxYear: string;
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    /** `null` until a real current-year estimate exists. Never an invented figure. */
    estimatedTaxDue: number | null;
    recordsCount: number;
  };
  editMode: boolean;
  size: "normal" | "wide";
  config?: TaxWidgetConfig;
  onUpdateConfig?: (config: TaxWidgetConfig) => void;
  onToggleSize?: () => void;
  onHide?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  dragProps?: any;
}

export const TaxWidget: FC<TaxWidgetProps> = ({
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
  const metricMode = config.metricMode || "taxDue";
  const filterSource = config.filterSource || "all";

  return (
    <DashboardWidgetCard
      dragProps={dragProps}
      editMode={editMode}
      isFirst={isFirst}
      isLast={isLast}
      size={size}
      widgetKey="tax"
      onHide={onHide}
      onMoveDown={onMoveDown}
      onMoveUp={onMoveUp}
      onToggleSize={onToggleSize}
      renderSettings={(isOpen, onClose) => (
        <WidgetSettingsModal
          description="Customize the primary tax metric and income filter."
          isOpen={isOpen}
          title="Tax Widget Settings"
          onClose={onClose}
        >
          <div>
            <span
              className={css({ fontSize: "sm", fontWeight: "semibold", display: "block", mb: 2 })}
            >
              Primary Highlight Metric
            </span>
            <div className={css({ display: "flex", gap: "8px" })}>
              <button
                type="button"
                className={css({
                  flex: 1,
                  padding: "8px",
                  borderRadius: "md",
                  border: "1px solid",
                  borderColor: metricMode === "taxDue" ? "primary" : "border",
                  backgroundColor: metricMode === "taxDue" ? "rgba(99,99,241,0.08)" : "surface",
                  cursor: "pointer",
                  fontSize: "xs",
                  fontWeight: "medium",
                })}
                onClick={() => onUpdateConfig?.({ ...config, metricMode: "taxDue" })}
              >
                Est. Tax Due
              </button>
              <button
                type="button"
                className={css({
                  flex: 1,
                  padding: "8px",
                  borderRadius: "md",
                  border: "1px solid",
                  borderColor: metricMode === "netProfit" ? "primary" : "border",
                  backgroundColor: metricMode === "netProfit" ? "rgba(99,99,241,0.08)" : "surface",
                  cursor: "pointer",
                  fontSize: "xs",
                  fontWeight: "medium",
                })}
                onClick={() => onUpdateConfig?.({ ...config, metricMode: "netProfit" })}
              >
                Net Profit
              </button>
            </div>
          </div>

          <div>
            <span
              className={css({ fontSize: "sm", fontWeight: "semibold", display: "block", mb: 2 })}
            >
              Income Stream Filter
            </span>
            <div className={css({ display: "flex", gap: "8px" })}>
              {[
                { label: "All Income", val: "all" },
                { label: "Rental", val: "rental" },
                { label: "Self-Employed", val: "self-employed" },
              ].map(({ label, val }) => (
                <button
                  key={val}
                  type="button"
                  className={css({
                    flex: 1,
                    padding: "8px",
                    borderRadius: "md",
                    border: "1px solid",
                    borderColor: filterSource === val ? "primary" : "border",
                    backgroundColor: filterSource === val ? "rgba(99,99,241,0.08)" : "surface",
                    cursor: "pointer",
                    fontSize: "xs",
                    fontWeight: "medium",
                  })}
                  onClick={() => onUpdateConfig?.({ ...config, filterSource: val as any })}
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
              {metricMode === "taxDue"
                ? `Est. Tax Due (${data.taxYear})`
                : `Net Profit (${data.taxYear})`}
            </FLPText>
            <FLPHeading
              as="h2"
              color="text.primary"
              className={css({
                fontSize: { base: "lg", sm: "xl", md: "2xl" },
                lineHeight: "tight",
                fontVariantNumeric: "tabular-nums",
              })}
            >
              {metricMode === "taxDue" ? (
                data.estimatedTaxDue === null ? (
                  <NotSet actionLabel="Add income" href="/app/tax" label="Not calculated yet" />
                ) : (
                  formatCurrency(data.estimatedTaxDue)
                )
              ) : (
                formatCurrency(data.netProfit)
              )}
            </FLPHeading>
          </div>
          <div
            className={css({
              textAlign: { base: "left", sm: size === "wide" ? "right" : "left", md: "right" },
            })}
          >
            <FLPText color="text.muted" fontSize="10px">
              {data.recordsCount} {data.recordsCount === 1 ? "record" : "records"}
            </FLPText>
            <div
              className={css({
                display: "flex",
                gap: "6px",
                fontSize: { base: "10px", md: "xs" },
                mt: "1px",
              })}
            >
              <span style={{ color: "var(--colors-text-primary)", fontWeight: 600 }}>
                +{formatCurrency(data.totalIncome)}
              </span>
              <span style={{ color: "var(--colors-text-muted)", fontWeight: 600 }}>
                -{formatCurrency(data.totalExpenses)}
              </span>
            </div>
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
            <span style={{ color: "var(--colors-text-muted)" }}>Tax Year:</span>{" "}
            <strong>{data.taxYear}</strong>
          </div>
          <div style={{ color: "var(--colors-primary)", fontWeight: 600 }}>Breakdown →</div>
        </div>
      </div>
    </DashboardWidgetCard>
  );
};
