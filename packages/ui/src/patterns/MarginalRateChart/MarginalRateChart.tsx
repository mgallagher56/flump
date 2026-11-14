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
  /**
   * Which threshold markers to draw. "all" (default) draws every one. "near-pay" draws only the
   * nearest threshold below and above `yourPay`, so the lines that matter to this pay are not lost
   * among the others; with no `yourPay` on the chart it draws them all.
   */
  thresholdFocus?: "all" | "near-pay";
  /**
   * Offer the data table behind the chart's own "Show data". Default true. Pass false only when
   * the caller shows `MarginalRateDataTable` in another disclosure on the same view.
   */
  showDataTable?: boolean;
  /**
   * Show the one line under the chart that says what the dashed lines are. Default true. Pass
   * false only when the caller shows `EXPLORER_COPY.chartThresholdsNote` elsewhere on the view.
   */
  showThresholdNote?: boolean;
  className?: string;
}

/** The chart's rows for a data table: the given rows, or the points every £5,000. */
export const marginalRateTableRows = (
  points: readonly MarginalRatePoint[],
  dataTable?: readonly MarginalRatePoint[],
): readonly MarginalRatePoint[] => dataTable ?? points.filter((p) => p.gross % TABLE_STEP === 0);

/** The chart's figures as a table: pay before tax and the estimated share deducted. */
export const MarginalRateDataTable: FC<{ caption: string; rows: readonly MarginalRatePoint[] }> = ({
  caption,
  rows,
}) => (
  <Table caption={caption} className={marginalRateTable()}>
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
);

/** Drawing width before the container is measured (server render, tests). */
const DEFAULT_W = 600;
const MIN_W = 300;
/** Drawing height: shorter on a phone, where the plot is narrow and a tall one only adds scroll. */
const H_WIDE = 280;
const H_NARROW = 200;
const NARROW_W = 480;
const M = { top: 28, right: 14, bottom: 30, left: 46 };
const Y_STEP = 25;
const TABLE_STEP = 5000;
const HIT_W = 24;
const TIP_W = 260;
const TIP_H = 72;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const pctText = (n: number, digits = 0) =>
  formatNumber(n, { kind: "percent", fractionDigits: digits }).text;

export interface MarkerGroup {
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

/** The nearest marker below and the nearest above a pay (either may be missing). */
export const markersNearPay = (markers: readonly MarkerGroup[], pay: number): MarkerGroup[] => {
  const below = markers.filter((m) => m.gross <= pay).at(-1);
  const above = markers.find((m) => m.gross > pay);
  return [below, above].filter((m): m is MarkerGroup => m !== undefined);
};

/**
 * Y axis ticks every 25%, up to the first tick at or above the highest rate on the line (never past
 * 100%), so a curve that tops out at 62% is not drawn in the bottom half of the plot.
 */
export const yTicksFor = (rates: readonly number[]): number[] => {
  const top = Math.max(0, ...rates.filter(Number.isFinite));
  const max = Math.min(100, Math.max(Y_STEP, Math.ceil(top / Y_STEP) * Y_STEP));
  const ticks: number[] = [];
  for (let t = 0; t <= max; t += Y_STEP) ticks.push(t);
  return ticks;
};

/** Rough width of one character of a direct label (xs, semibold), in px. */
const LABEL_CHAR_W = 7;
/** Clear space kept between a direct label and a vertical line. */
const LABEL_CLEARANCE = 6;

/**
 * Where to draw the line's direct label (its left edge, text anchored at the start): the left end
 * of the widest gap between vertical lines (a dashed threshold or "Your pay"), which on the pay
 * rise curve is the long plateau between the higher rate and the Personal Allowance taper. `clear`
 * is false when even that gap is narrower than the label (a phone), so the label may run past the
 * next vertical line; the caller then lifts it above the line there too. Never runs off the plot.
 */
export const lineLabelSpot = (
  verticals: readonly number[],
  left: number,
  right: number,
  labelW: number,
): { x: number; clear: boolean } => {
  const inside = verticals.filter((v) => v > left && v < right).sort((a, b) => a - b);
  const edges = [left, ...inside, right];
  let best = { from: left, to: right, width: -1 };
  for (let i = 1; i < edges.length; i++) {
    const from = i === 1 ? left : (edges[i - 1] ?? left) + LABEL_CLEARANCE;
    const to = i === edges.length - 1 ? right : (edges[i] ?? right) - LABEL_CLEARANCE;
    if (to - from > best.width) best = { from, to, width: to - from };
  }
  return { x: Math.max(left, Math.min(best.from, right - labelW)), clear: best.width >= labelW };
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
  thresholdFocus = "all",
  showDataTable = true,
  showThresholdNote = true,
  className,
}) => {
  // Keyed by gross pay so the open tooltip survives markers being added or removed.
  const [activeGross, setActiveGross] = useState<number | null>(null);
  const { ref, width: W } = useContainerWidth();
  const plotW = W - M.left - M.right;
  const H = W < NARROW_W ? H_NARROW : H_WIDE;
  const PLOT_H = H - M.top - M.bottom;
  const maxGross = Math.max(1, ...points.map((p) => p.gross));
  const yTicks = useMemo(() => yTicksFor(points.map((p) => p.ratePct)), [points]);
  const yMax = yTicks[yTicks.length - 1] ?? 100;
  const x = (g: number) => M.left + (clamp(g, 0, maxGross) / maxGross) * plotW;
  const y = (r: number) => M.top + PLOT_H - (clamp(r, 0, yMax) / yMax) * PLOT_H;

  const line = points.map((p) => `${x(p.gross).toFixed(1)},${y(p.ratePct).toFixed(1)}`).join(" ");
  const showYourPay =
    yourPay !== undefined && Number.isFinite(yourPay) && yourPay >= 0 && yourPay <= maxGross;
  const markers = useMemo(() => {
    const all = groupThresholds(thresholds, maxGross);
    return thresholdFocus === "near-pay" && showYourPay && yourPay !== undefined
      ? markersNearPay(all, yourPay)
      : all;
  }, [thresholds, maxGross, thresholdFocus, showYourPay, yourPay]);
  const xTicks: number[] = [];
  for (let g = 0; g <= maxGross + 1e-9; g += xTickStep(maxGross)) xTicks.push(g);

  const rows = marginalRateTableRows(points, dataTable);

  // Direct labels (P10.2) in place of a legend: the line is named at its end, "Your pay" at its
  // marker and the stepped zone inside its band; the dashed thresholds get one quiet line below.
  const lastPoint = points[points.length - 1];
  const labelW = EXPLORER_COPY.chartLineLabel.length * LABEL_CHAR_W;
  const verticals = [
    ...markers.map((m) => x(m.gross)),
    ...(showYourPay && yourPay !== undefined ? [x(yourPay)] : []),
  ];
  // The highest point of the line under a label starting at `lx` (and a little past its end, so a
  // step just after it is cleared too): the label sits above it, never covering the line.
  const rateUnder = (lx: number) =>
    Math.max(
      0,
      ...points
        .filter((p) => x(p.gross) >= lx && x(p.gross) <= lx + labelW + LABEL_CLEARANCE)
        .map((p) => p.ratePct),
    );
  // "Your pay" is written above the plot, centred on its marker (or anchored at an edge).
  const yourPayBox = (() => {
    if (!showYourPay || yourPay === undefined) return null;
    const px = x(yourPay);
    const w = EXPLORER_COPY.yourPay.length * LABEL_CHAR_W;
    const from = px > W - 60 ? px - w : px < M.left + 30 ? px : px - w / 2;
    return {
      x1: from - LABEL_CLEARANCE,
      x2: from + w + LABEL_CLEARANCE,
      y1: M.top - 26,
      y2: M.top - 6,
    };
  })();
  // Whether a label starting at `lx` stays inside the drawing and off the "Your pay" text and the
  // stepped-zone labels.
  const spotFree = (lx: number) => {
    const top = y(rateUnder(lx)) - 8 - 11;
    if (top < 0) return false;
    const hitsYourPay =
      yourPayBox !== null &&
      lx < yourPayBox.x2 &&
      lx + labelW > yourPayBox.x1 &&
      top < yourPayBox.y2 &&
      top + 13 > yourPayBox.y1;
    const hitsZoneLabel = steppedZones.some((z) => {
      const cx = (x(z.from) + x(z.to)) / 2;
      const half = (z.label.length * LABEL_CHAR_W) / 2;
      return lx < cx + half && lx + labelW > cx - half && top + 13 > M.top + PLOT_H - 22;
    });
    return !hitsYourPay && !hitsZoneLabel;
  };
  // The widest gap between vertical lines first (on the pay rise curve, the higher rate plateau).
  // When that gap is too narrow (a phone) or the label there would touch "Your pay", try every
  // start along the plot: one clear of every vertical wins, then the one where the line runs
  // lowest. The label may then cross a dashed line, but it never covers "Your pay".
  const labelSpot = (() => {
    const widest = lineLabelSpot(verticals, M.left, W - M.right, labelW);
    if (widest.clear && spotFree(widest.x)) return { ...widest, hidden: false };
    let best: { x: number; crosses: boolean; rate: number } | null = null;
    const payX = showYourPay && yourPay !== undefined ? x(yourPay) : null;
    for (let lx = M.left; lx <= W - M.right - labelW; lx += 4) {
      if (!spotFree(lx)) continue;
      // A dashed threshold may run through the label; the solid "Your pay" line may not.
      if (payX !== null && payX >= lx - LABEL_CLEARANCE && payX <= lx + labelW + LABEL_CLEARANCE)
        continue;
      const rate = rateUnder(lx);
      const crosses = verticals.some(
        (v) => v >= lx - LABEL_CLEARANCE && v <= lx + labelW + LABEL_CLEARANCE,
      );
      if (
        best === null ||
        (best.crosses && !crosses) ||
        (best.crosses === crosses && rate < best.rate)
      ) {
        best = { x: lx, crosses, rate };
      }
    }
    return best ? { x: best.x, clear: !best.crosses, hidden: false } : { ...widest, hidden: true };
  })();
  const rateUnderLabel = rateUnder(labelSpot.x);
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
        showDataTable && rows.length > 0 ? (
          <MarginalRateDataTable caption={title} rows={rows} />
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
          {yTicks.map((t) => (
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
          {/* Left out only when no spot keeps it off "Your pay" (a narrow phone): the title
              already names the line, so no label is better than one written over that line. */}
          {lastPoint && !labelSpot.hidden ? (
            <text
              className={marginalRateDirectLabel({ tone: "line" })}
              data-testid="marginal-rate-line-label"
              textAnchor="start"
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
        {showThresholdNote && markers.length > 0 ? (
          <p className={marginalRateNote()}>{EXPLORER_COPY.chartThresholdsNote}</p>
        ) : null}
      </div>
    </ChartFigure>
  );
};

export default MarginalRateChart;
