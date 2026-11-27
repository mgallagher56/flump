import type { FC } from "react";
import { PLOT, pct, plotPath, readoutWidth, shareFromTop } from "./chartGeometry";
import * as s from "./DrawnLineChart.styles";

export interface DrawnLineChartProps {
  /** Unique on the page: names the line's clip. */
  id: string;
  values: readonly number[];
  /** The marker's readout at each point, for example "£21,000, Nov". */
  readouts: readonly string[];
  min: number;
  max: number;
  /** Labels under the chart, at a point's index. */
  ticks: readonly { label: string; index: number }[];
  /** The line's colour, as prototype 11: sky for savings, violet for debt (never rose). */
  tone: "sky" | "violet";
  /** `setPiece`: an area page's set piece, taller at mid widths (the approved area prototypes). */
  size?: "journey" | "setPiece";
}

/** Readout box height and its lift above the marker, in CSS pixels. */
const BOX_H = 26;
const LIFT = 12;

/**
 * A sample line chart that can draw itself (STYLE-GUIDE 11.2, "Self-drawing chart"), from
 * prototype 11's `Chart`. It renders finished: the whole line, the marker on the last point and
 * its readout (MK1). `drawChartMoment` widens the line's clip and walks the marker along it, once.
 * Decorative to assistive technology: the sample beside it carries the figures in words.
 *
 * The plot is stretched to the chart's box; the marker, readout and ticks sit in CSS pixels at
 * percentage positions, so they never stretch.
 */
export const DrawnLineChart: FC<DrawnLineChartProps> = ({
  id,
  values,
  readouts,
  min,
  max,
  ticks,
  tone,
  size = "journey",
}) => {
  const line = plotPath(values, max, min);
  const area = `${line} L${PLOT.width},${PLOT.height} L0,${PLOT.height} Z`;
  const lastIndex = values.length - 1;
  const lastY = shareFromTop(values[lastIndex] ?? min, max, min);
  const label = readouts[lastIndex] ?? "";
  const width = readoutWidth(label);
  const clipId = `drawn-chart-${id}`;
  const anchor = (index: number) =>
    index <= 0 ? "start" : index >= lastIndex ? "end" : ("middle" as const);
  return (
    <div
      className={s.chart({ size, tone })}
      data-drawn-chart={id}
      data-max={max}
      data-min={min}
      data-readouts={readouts.join("|")}
      data-values={values.join(",")}
    >
      <svg aria-hidden="true" className={s.frame} focusable="false">
        <svg
          aria-hidden="true"
          height="100%"
          overflow="visible"
          preserveAspectRatio="none"
          viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
          width="100%"
        >
          <defs>
            <clipPath id={clipId}>
              <rect data-chart-clip="" height={PLOT.height + 40} width={PLOT.width} x="0" y="-20" />
            </clipPath>
          </defs>
          {[0.25, 0.5, 0.75].map((g) => (
            <line
              className={s.grid}
              key={g}
              vectorEffect="non-scaling-stroke"
              x1="0"
              x2={PLOT.width}
              y1={PLOT.height * g}
              y2={PLOT.height * g}
            />
          ))}
          <line
            className={s.base}
            vectorEffect="non-scaling-stroke"
            x1="0"
            x2={PLOT.width}
            y1={PLOT.height}
            y2={PLOT.height}
          />
          <g clipPath={`url(#${clipId})`}>
            <path className={s.area} d={area} />
            <path className={s.line} d={line} vectorEffect="non-scaling-stroke" />
          </g>
        </svg>
        <circle className={s.marker} cx="100%" cy={pct(lastY)} data-chart-marker="" r="7" />
        <svg aria-hidden="true" data-chart-readout="" overflow="visible" x="100%" y={pct(lastY)}>
          <rect
            className={s.readoutBox}
            data-readout-box=""
            height={BOX_H}
            rx="8"
            width={width}
            x={-width}
            y={-(BOX_H + LIFT)}
          />
          <text className={s.readoutText} data-readout-text="" x={-width + 9} y={-(LIFT + 8)}>
            {label}
          </text>
        </svg>
        {ticks.map((t) => (
          <text
            className={s.tick}
            dy="22"
            key={t.label}
            textAnchor={anchor(t.index)}
            x={pct(lastIndex > 0 ? t.index / lastIndex : 0)}
            y="100%"
          >
            {t.label}
          </text>
        ))}
      </svg>
    </div>
  );
};
