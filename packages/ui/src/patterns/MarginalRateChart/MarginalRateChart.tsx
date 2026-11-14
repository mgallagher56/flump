import {
  type FC,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cx } from "../../../styled-system/css";
import { formatAxisCurrency } from "../../charts/formatAxisCurrency";
import { formatMoney, formatNumber } from "../../primitives/Money/Money";
import { Table, TBody, Td, THead, Th, Tr } from "../../primitives/Table/Table";
import { ChartFigure } from "../ChartFigure/ChartFigure";
import { EXPLORER_COPY, thresholdTooltip } from "../TakeHomeDeltaPanel/copy";
import {
  marginalRateAxisText,
  marginalRateAxisTitle,
  marginalRateBand,
  marginalRateChartArea,
  marginalRateDirectLabel,
  marginalRateFigure,
  marginalRateGrid,
  marginalRateHitArea,
  marginalRateLine,
  marginalRateNote,
  marginalRateSvg,
  marginalRateTable,
  marginalRateThreshold,
  marginalRateThresholdHandle,
  marginalRateTooltip,
  marginalRateTooltipFrame,
  marginalRateYourPay,
  marginalRateYourPayDot,
  marginalRateYourPayText,
} from "./MarginalRateChart.styles";

export interface MarginalRatePoint {
  gross: number;
  /** Estimated per cent of the next £1,000 deducted (28 means 28%). */
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
  /**
   * Show the summary under the title. Default true; pass false when it says the same as the
   * thresholds note under the chart (it stays the screen-reader text alternative).
   */
  showSummary?: boolean;
  notice?: ReactNode;
  /** Rows for the "Show data" table. Defaults to the points every £5,000. */
  dataTable?: readonly MarginalRatePoint[];
  headingLevel?: "h2" | "h3" | "h4";
  className?: string;
}

/** Drawing width before the container is measured (server render, tests). */
const DEFAULT_W = 600;
const MIN_W = 300;
const H = 280;
const M = { top: 28, right: 14, bottom: 30, left: 46 };
const PLOT_H = H - M.top - M.bottom;
const Y_TICKS = [0, 25, 50, 75, 100];
const TABLE_STEP = 5000;
const HIT_W = 24;
const TIP_W = 260;
const TIP_H = 72;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const pctText = (n: number, digits = 0) =>
  formatNumber(n, { kind: "percent", fractionDigits: digits }).text;

interface MarkerGroup {
  gross: number;
  name: string;
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
    .map(([gross, labels]) => ({
      gross,
      name: thresholdTooltip(labels.join("; "), formatMoney(gross).text),
    }));
};

/** Rough width of one character of a direct label (xs, semibold), in px. */
const LABEL_CHAR_W = 7;
/** Clear space kept between a direct label and a vertical line. */
const LABEL_CLEARANCE = 6;

/**
 * Where to draw the line's direct label so it crosses no vertical line (a dashed threshold or
 * "Your pay"): the right-hand end of the right-most gap wide enough for it. Falls back to the end
 * of the plot when no gap is wide enough (a very narrow chart).
 */
export const lineLabelSpot = (
  verticals: readonly number[],
  left: number,
  right: number,
  labelW: number,
): { x: number; clear: boolean } => {
  const inside = verticals.filter((v) => v > left && v < right).sort((a, b) => a - b);
  const edges = [left, ...inside, right];
  for (let i = edges.length - 1; i > 0; i--) {
    const from = i - 1 === 0 ? left : (edges[i - 1] ?? left) + LABEL_CLEARANCE;
    const to = i === edges.length - 1 ? right : (edges[i] ?? right) - LABEL_CLEARANCE;
    if (to - from >= labelW) return { x: to, clear: true };
  }
  return { x: right, clear: false };
};

const xTickStep = (max: number) => Math.max(10_000, Math.ceil(max / 3 / 10_000) * 10_000);

/**
 * The drawing is sized to its container (1 SVG unit = 1 CSS pixel), so text set with font tokens
 * stays readable on a phone instead of shrinking with a fixed viewBox.
 */
const useContainerWidth = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_W);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 0) setWidth(Math.max(MIN_W, w));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
};

/** Hand-written SVG line chart of the estimated share of the next £1,000 deducted, by gross pay. */
export const MarginalRateChart: FC<MarginalRateChartProps> = ({
  points,
  thresholds,
  steppedZones = [],
  yourPay,
  title,
  summary,
  showSummary = true,
  notice,
  dataTable,
  headingLevel,
  className,
}) => {
  // Keyed by gross pay so the open tooltip survives markers being added or removed.
  const [activeGross, setActiveGross] = useState<number | null>(null);
  const { ref, width: W } = useContainerWidth();
  const plotW = W - M.left - M.right;
  const maxGross = Math.max(1, ...points.map((p) => p.gross));
  const x = (g: number) => M.left + (clamp(g, 0, maxGross) / maxGross) * plotW;
  const y = (r: number) => M.top + PLOT_H - (clamp(r, 0, 100) / 100) * PLOT_H;

  const line = points.map((p) => `${x(p.gross).toFixed(1)},${y(p.ratePct).toFixed(1)}`).join(" ");
  const markers = useMemo(() => groupThresholds(thresholds, maxGross), [thresholds, maxGross]);
  const xTicks: number[] = [];
  for (let g = 0; g <= maxGross + 1e-9; g += xTickStep(maxGross)) xTicks.push(g);

  const rows = dataTable ?? points.filter((p) => p.gross % TABLE_STEP === 0);
  const showYourPay =
    yourPay !== undefined && Number.isFinite(yourPay) && yourPay >= 0 && yourPay <= maxGross;

  // Direct labels (P10.2) in place of a legend: the line is named at its end, "Your pay" at its
  // marker and the stepped zone inside its band; the dashed thresholds get one quiet line below.
  const lastPoint = points[points.length - 1];
  const labelW = EXPLORER_COPY.chartLineLabel.length * LABEL_CHAR_W;
  const labelSpot = lineLabelSpot(
    [
      ...markers.map((m) => x(m.gross)),
      ...(showYourPay && yourPay !== undefined ? [x(yourPay)] : []),
    ],
    M.left,
    W - M.right,
    labelW,
  );
  // Sit above the highest point of the line under the label, so the label never covers it.
  const rateUnderLabel = Math.max(
    0,
    ...points
      .filter((p) => x(p.gross) >= labelSpot.x - labelW && x(p.gross) <= labelSpot.x)
      .map((p) => p.ratePct),
    lastPoint && !labelSpot.clear ? lastPoint.ratePct : 0,
  );
  const activeMarker = markers.find((m) => m.gross === activeGross) ?? null;
  const tipW = Math.min(TIP_W, W - 16);
  const activeX = activeMarker ? x(activeMarker.gross) : 0;
  const tipAlign = activeX < W * 0.3 ? "start" : activeX > W * 0.7 ? "end" : "center";
  const tipX = clamp(
    tipAlign === "start"
      ? activeX - 12
      : tipAlign === "end"
        ? activeX - tipW + 12
        : activeX - tipW / 2,
    0,
    W - tipW,
  );

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Escape") setActiveGross(null);
  };

  return (
    <ChartFigure
      className={cx(marginalRateFigure(), className)}
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
      directLabels
      headingLevel={headingLevel}
      notice={notice}
      showSummary={showSummary}
      summary={summary}
      title={title}
    >
      <div className={marginalRateChartArea()} data-testid="marginal-rate-chart" ref={ref}>
        <svg
          className={marginalRateSvg()}
          focusable="false"
          height={H}
          role="presentation"
          viewBox={`0 0 ${W} ${H}`}
          width={W}
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
              <text className={marginalRateAxisText()} textAnchor="end" x={M.left - 8} y={y(t) + 4}>
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
          {markers.map((m) => (
            <g data-testid="marginal-rate-threshold" key={m.gross}>
              <title>{m.name}</title>
              <line
                className={marginalRateThreshold({ active: activeGross === m.gross })}
                x1={x(m.gross)}
                x2={x(m.gross)}
                y1={M.top}
                y2={M.top + PLOT_H}
              />
              <circle className={marginalRateThresholdHandle()} cx={x(m.gross)} cy={M.top} r="4" />
            </g>
          ))}
          {steppedZones.map((z) => (
            <text
              className={marginalRateDirectLabel()}
              data-testid="marginal-rate-zone-label"
              key={`label-${z.from}-${z.to}`}
              textAnchor="middle"
              x={(x(z.from) + x(z.to)) / 2}
              y={M.top + PLOT_H - 8}
            >
              {z.label}
            </text>
          ))}
          <polyline className={marginalRateLine()} data-testid="marginal-rate-line" points={line} />
          {lastPoint ? (
            <text
              className={marginalRateDirectLabel({ tone: "line" })}
              data-testid="marginal-rate-line-label"
              textAnchor="end"
              x={labelSpot.x}
              y={y(rateUnderLabel) - 8}
            >
              {EXPLORER_COPY.chartLineLabel}
            </text>
          ) : null}
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
          {/* Hover and focus targets, 24px wide, over each threshold line. */}
          {markers.map((m) => (
            <foreignObject
              height={PLOT_H + 8}
              key={`hit-${m.gross}`}
              width={HIT_W}
              x={x(m.gross) - HIT_W / 2}
              y={M.top - 8}
            >
              <button
                aria-label={m.name}
                className={marginalRateHitArea()}
                data-testid="marginal-rate-threshold-hit"
                type="button"
                onBlur={() => setActiveGross(null)}
                onFocus={() => setActiveGross(m.gross)}
                onKeyDown={onKeyDown}
                onMouseEnter={() => setActiveGross(m.gross)}
                onMouseLeave={() => setActiveGross((cur) => (cur === m.gross ? null : cur))}
              />
            </foreignObject>
          ))}
          {activeMarker ? (
            <foreignObject height={TIP_H} width={tipW} x={tipX} y={M.top + 4}>
              <div className={marginalRateTooltipFrame({ align: tipAlign })}>
                <div className={marginalRateTooltip()} data-testid="marginal-rate-tooltip">
                  {activeMarker.name}
                </div>
              </div>
            </foreignObject>
          ) : null}
        </svg>
        <p className={marginalRateAxisTitle({ position: "end" })}>{EXPLORER_COPY.chartXAxis}</p>
        {markers.length > 0 ? (
          <p className={marginalRateNote()}>{EXPLORER_COPY.chartThresholdsNote}</p>
        ) : null}
      </div>
    </ChartFigure>
  );
};

export default MarginalRateChart;
