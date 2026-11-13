import { type CSSProperties, type FC, type ReactNode, useMemo, useState } from "react";
import { formatAxisCurrency } from "../../charts/formatAxisCurrency";
import { formatMoney, formatNumber } from "../../primitives/Money/Money";
import { Table, TBody, Td, THead, Th, Tr } from "../../primitives/Table/Table";
import { ChartFigure } from "../ChartFigure/ChartFigure";
import { ChartLegend, type ChartLegendItem } from "../ChartLegend/ChartLegend";
import { EXPLORER_COPY, thresholdTooltip } from "../TakeHomeDeltaPanel/copy";
import {
  marginalRateAxisText,
  marginalRateAxisTitle,
  marginalRateBand,
  marginalRateChartArea,
  marginalRateChartPlot,
  marginalRateGrid,
  marginalRateHitArea,
  marginalRateLine,
  marginalRateSvg,
  marginalRateTable,
  marginalRateThreshold,
  marginalRateThresholdHandle,
  marginalRateTooltip,
  marginalRateYourPay,
  marginalRateYourPayDot,
  marginalRateYourPayText,
} from "./MarginalRateChart.styles";

export interface MarginalRatePoint {
  gross: number;
  /** Per cent of the next £1 deducted (28 means 28%). */
  ratePct: number;
}

export interface MarginalRateThresholdMarker {
  gross: number;
  label: string;
}

export interface MarginalRateSteppedZone {
  from: number;
  to: number;
  label: string;
}

export interface MarginalRateChartProps {
  points: readonly MarginalRatePoint[];
  thresholds: readonly MarginalRateThresholdMarker[];
  steppedZones?: readonly MarginalRateSteppedZone[];
  /** Gross pay to mark as "Your pay". */
  yourPay?: number;
  title: string;
  /** Text alternative, built by the caller (en-GB figures). */
  summary: string;
  notice?: ReactNode;
  /** Rows for the "Show data" table. Defaults to the points every £5,000. */
  dataTable?: readonly MarginalRatePoint[];
  headingLevel?: "h2" | "h3" | "h4";
  className?: string;
}

const W = 600;
const H = 280;
const M = { top: 28, right: 14, bottom: 30, left: 46 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;
const Y_TICKS = [0, 25, 50, 75, 100];
const TABLE_STEP = 5000;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const pctText = (n: number, digits = 0) =>
  formatNumber(n, { kind: "percent", fractionDigits: digits }).text;

interface MarkerGroup {
  gross: number;
  labels: string[];
}

/** Thresholds at the same gross pay (Income Tax and National Insurance at £12,570, say) share one marker. */
const groupThresholds = (
  thresholds: readonly MarginalRateThresholdMarker[],
  maxGross: number,
): MarkerGroup[] => {
  const groups = new Map<number, string[]>();
  for (const t of thresholds) {
    if (!Number.isFinite(t.gross) || t.gross < 0 || t.gross > maxGross) continue;
    const key = Math.round(t.gross);
    groups.set(key, [...(groups.get(key) ?? []), t.label]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([gross, labels]) => ({ gross, labels }));
};

const xTickStep = (max: number) => Math.max(10_000, Math.ceil(max / 3 / 10_000) * 10_000);

/** Hand-written SVG line chart of the share of the next £1 deducted, by gross pay. */
export const MarginalRateChart: FC<MarginalRateChartProps> = ({
  points,
  thresholds,
  steppedZones = [],
  yourPay,
  title,
  summary,
  notice,
  dataTable,
  headingLevel,
  className,
}) => {
  const [active, setActive] = useState<number | null>(null);
  const maxGross = Math.max(1, ...points.map((p) => p.gross));
  const x = (g: number) => M.left + (clamp(g, 0, maxGross) / maxGross) * PLOT_W;
  const y = (r: number) => M.top + PLOT_H - (clamp(r, 0, 100) / 100) * PLOT_H;

  const line = useMemo(
    () => points.map((p) => `${x(p.gross).toFixed(1)},${y(p.ratePct).toFixed(1)}`).join(" "),
    // x and y only depend on maxGross, which depends on points.
    [points],
  );
  const markers = useMemo(() => groupThresholds(thresholds, maxGross), [thresholds, maxGross]);
  const xTicks: number[] = [];
  for (let g = 0; g <= maxGross + 1e-9; g += xTickStep(maxGross)) xTicks.push(g);

  const rows = dataTable ?? points.filter((p) => p.gross % TABLE_STEP === 0);
  const showYourPay =
    yourPay !== undefined && Number.isFinite(yourPay) && yourPay >= 0 && yourPay <= maxGross;

  const legendItems: ChartLegendItem[] = [
    { id: "rate", label: EXPLORER_COPY.chartLine, color: "primary", swatch: "line" },
    ...(markers.length > 0
      ? [
          {
            id: "thresholds",
            label: EXPLORER_COPY.chartThresholds,
            color: "baseline",
            swatch: "dashed",
          } as const,
        ]
      : []),
    ...(showYourPay
      ? [{ id: "you", label: EXPLORER_COPY.yourPay, color: "warning", swatch: "line" } as const]
      : []),
    ...steppedZones.map((z, i) => ({
      id: `zone-${i}`,
      label: z.label,
      color: "band",
      swatch: "area" as const,
    })),
  ];

  const activeMarker = active === null ? null : markers[active];
  const activeX = activeMarker ? x(activeMarker.gross) : 0;
  const tipAlign = activeX < W * 0.3 ? "start" : activeX > W * 0.7 ? "end" : "center";
  const tipStyle = { "--tip-x": `${(activeX / W) * 100}%` } as CSSProperties;

  return (
    <ChartFigure
      className={className}
      dataTable={
        rows.length > 0 ? (
          <Table caption={title} className={marginalRateTable()}>
            <THead>
              <Tr>
                <Th scope="col">{EXPLORER_COPY.tableGross}</Th>
                <Th numeric scope="col">
                  {EXPLORER_COPY.tableRate}
                </Th>
              </Tr>
            </THead>
            <TBody>
              {rows.map((r) => (
                <Tr key={r.gross}>
                  <Th scope="row">{formatMoney(r.gross).text}</Th>
                  <Td label={EXPLORER_COPY.tableRate} numeric>
                    {pctText(r.ratePct, Number.isInteger(r.ratePct) ? 0 : 1)}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        ) : undefined
      }
      headingLevel={headingLevel}
      legend={<ChartLegend items={legendItems} />}
      notice={notice}
      summary={summary}
      title={title}
    >
      <div className={marginalRateChartArea()} data-testid="marginal-rate-chart">
        <p className={marginalRateAxisTitle()}>{EXPLORER_COPY.chartYAxis}</p>
        <div className={marginalRateChartPlot()}>
          <svg
            className={marginalRateSvg()}
            focusable="false"
            role="presentation"
            viewBox={`0 0 ${W} ${H}`}
          >
            {steppedZones.map((z) => (
              <rect
                className={marginalRateBand()}
                data-testid="marginal-rate-stepped-zone"
                height={PLOT_H}
                key={`${z.from}-${z.to}`}
                width={Math.max(0, x(z.to) - x(z.from))}
                x={x(z.from)}
                y={M.top}
              >
                <title>{z.label}</title>
              </rect>
            ))}
            {Y_TICKS.map((t) => (
              <g key={t}>
                <line
                  className={marginalRateGrid()}
                  x1={M.left}
                  x2={W - M.right}
                  y1={y(t)}
                  y2={y(t)}
                />
                <text
                  className={marginalRateAxisText()}
                  textAnchor="end"
                  x={M.left - 8}
                  y={y(t) + 4}
                >
                  {pctText(t)}
                </text>
              </g>
            ))}
            {xTicks.map((g) => (
              <text
                className={marginalRateAxisText()}
                key={g}
                textAnchor={g === 0 ? "start" : g >= maxGross ? "end" : "middle"}
                x={x(g)}
                y={H - 8}
              >
                {formatAxisCurrency(g, { maxFractionDigits: 0 })}
              </text>
            ))}
            {markers.map((m, i) => {
              const name = thresholdTooltip(m.labels.join("; "), formatMoney(m.gross).text);
              return (
                <g data-testid="marginal-rate-threshold" key={m.gross}>
                  <title>{name}</title>
                  <line
                    className={marginalRateThreshold({ active: active === i })}
                    x1={x(m.gross)}
                    x2={x(m.gross)}
                    y1={M.top}
                    y2={M.top + PLOT_H}
                  />
                  <circle
                    className={marginalRateThresholdHandle()}
                    cx={x(m.gross)}
                    cy={M.top}
                    r="4"
                  />
                </g>
              );
            })}
            <polyline
              className={marginalRateLine()}
              data-testid="marginal-rate-line"
              points={line}
            />
            {showYourPay ? (
              <g data-testid="marginal-rate-your-pay">
                <title>{`${EXPLORER_COPY.yourPay}: ${formatMoney(yourPay).text}`}</title>
                <line
                  className={marginalRateYourPay()}
                  x1={x(yourPay)}
                  x2={x(yourPay)}
                  y1={M.top - 4}
                  y2={M.top + PLOT_H}
                />
                <circle className={marginalRateYourPayDot()} cx={x(yourPay)} cy={M.top - 4} r="4" />
                <text
                  className={marginalRateYourPayText()}
                  textAnchor={
                    x(yourPay) > W - 60 ? "end" : x(yourPay) < M.left + 30 ? "start" : "middle"
                  }
                  x={x(yourPay)}
                  y={M.top - 12}
                >
                  {EXPLORER_COPY.yourPay}
                </text>
              </g>
            ) : null}
          </svg>
          {markers.map((m, i) => (
            <button
              aria-label={thresholdTooltip(m.labels.join("; "), formatMoney(m.gross).text)}
              className={marginalRateHitArea()}
              data-testid="marginal-rate-threshold-hit"
              key={m.gross}
              style={{ "--mx": `${(x(m.gross) / W) * 100}%` } as CSSProperties}
              type="button"
              onBlur={() => setActive(null)}
              onFocus={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive((cur) => (cur === i ? null : cur))}
            />
          ))}
          {activeMarker ? (
            <div
              className={marginalRateTooltip({ align: tipAlign })}
              data-testid="marginal-rate-tooltip"
              style={tipStyle}
            >
              {thresholdTooltip(
                activeMarker.labels.join("; "),
                formatMoney(activeMarker.gross).text,
              )}
            </div>
          ) : null}
        </div>
        <p className={marginalRateAxisTitle({ position: "end" })}>{EXPLORER_COPY.chartXAxis}</p>
      </div>
    </ChartFigure>
  );
};

export default MarginalRateChart;
