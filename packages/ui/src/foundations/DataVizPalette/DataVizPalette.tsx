import type { FC } from "react";
import { css } from "../../../styled-system/css";
import {
  CHART_RULES,
  type ChartColorRole,
  chartColor,
  formatAxisCurrency,
  SERIES_ROLES,
} from "../../charts";
import {
  axisText,
  caption,
  chartCard,
  chartSvg,
  legendItem,
  legendList,
  page,
  swatchCaption,
  swatchCard,
  swatchGrid,
} from "./DataVizPalette.styles";

const W = 640;
const H = 260;
const PAD = { left: 56, right: 16, top: 16, bottom: 32 };
const YEARS = [2026, 2028, 2030, 2032, 2034, 2036];
const Y_MAX = 400_000;

const xAt = (i: number) => PAD.left + (i / (YEARS.length - 1)) * (W - PAD.left - PAD.right);
const yAt = (v: number) => PAD.top + (1 - v / Y_MAX) * (H - PAD.top - PAD.bottom);
const path = (values: number[], from = 0) =>
  values.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i + from)},${yAt(v)}`).join(" ");

type SampleSeries = {
  name: string;
  role: ChartColorRole;
  values: number[];
  dash?: string;
  marker: "circle" | "square" | "diamond" | "none";
};

const SERIES: SampleSeries[] = [
  {
    name: "Pension",
    role: "series1",
    values: [60e3, 95e3, 140e3, 190e3, 245e3, 310e3],
    marker: "circle",
  },
  {
    name: "ISA",
    role: "series2",
    values: [30e3, 52e3, 78e3, 108e3, 142e3, 180e3],
    dash: "6 4",
    marker: "square",
  },
  {
    name: "Cash",
    role: "series3",
    values: [20e3, 24e3, 28e3, 31e3, 34e3, 36e3],
    dash: "2 3",
    marker: "diamond",
  },
];
const PROJECTION = { name: "Projection (assumes 5%)", values: [310e3, 345e3, 380e3], from: 3 };
const BAND = { upper: [310e3, 365e3, 400e3], lower: [310e3, 330e3, 345e3], from: 3 };

const Marker: FC<{ shape: SampleSeries["marker"]; x: number; y: number; tone: ChartColorRole }> = ({
  shape,
  x,
  y,
  tone,
}) => {
  const fill = chartColor(tone);
  if (shape === "circle") return <circle cx={x} cy={y} r={4} fill={fill} />;
  if (shape === "square") return <rect x={x - 4} y={y - 4} width={8} height={8} fill={fill} />;
  if (shape === "diamond")
    return (
      <polygon points={`${x},${y - 5} ${x + 5},${y} ${x},${y + 5} ${x - 5},${y}`} fill={fill} />
    );
  return null;
};

const LegendKey: FC<{ tone: ChartColorRole; dash?: string; marker?: SampleSeries["marker"] }> = ({
  tone,
  dash,
  marker = "none",
}) => (
  <svg width="28" height="12" viewBox="0 0 28 12" aria-hidden="true" focusable="false">
    <line
      x1="0"
      y1="6"
      x2="28"
      y2="6"
      stroke={chartColor(tone)}
      strokeWidth="2"
      strokeDasharray={dash}
    />
    <Marker shape={marker} x={14} y={6} tone={tone} />
  </svg>
);

const SWATCHES: Array<{ role: ChartColorRole; label: string; note?: string }> = [
  ...SERIES_ROLES.map((role, i) => ({ role, label: `series${i + 1}` })),
  { role: "projection", label: "projection", note: "Always dashed" },
  { role: "band", label: "band", note: "Fill behind lines" },
  { role: "baseline", label: "baseline", note: "Reference lines" },
];

export const DataVizPalette: FC = () => (
  <div className={page()}>
    <header>
      <h1 className={css({ textStyle: "heading.lg", mb: "4px" })}>Data visualisation palette</h1>
      <p className={css({ textStyle: "body.sm", color: "text.muted" })}>
        Series colours identify the entity, never the outcome. Pair every colour with a direct
        label, marker or dash so colour is never the only cue.
      </p>
    </header>

    <section aria-labelledby="dv-swatches" className={css({ display: "grid", gap: "12px" })}>
      <h2 id="dv-swatches" className={css({ textStyle: "heading.sm" })}>
        Swatches
      </h2>
      <ul className={swatchGrid()}>
        {SWATCHES.map(({ role, label, note }) => (
          <li key={role} className={swatchCard()} data-testid={`swatch-${role}`}>
            <svg width="100%" height="28" aria-hidden="true" focusable="false">
              {role === "band" ? (
                <rect width="100%" height="28" rx="4" fill={chartColor(role)} />
              ) : role === "projection" || role === "baseline" ? (
                <line
                  x1="0"
                  y1="14"
                  x2="100%"
                  y2="14"
                  stroke={chartColor(role)}
                  strokeWidth="3"
                  strokeDasharray={role === "projection" ? "8 5" : undefined}
                />
              ) : (
                <rect width="100%" height="28" rx="4" fill={chartColor(role)} />
              )}
            </svg>
            <span>{label}</span>
            {note ? <span className={swatchCaption}>{note}</span> : null}
          </li>
        ))}
      </ul>
    </section>

    <section aria-labelledby="dv-sample" className={chartCard()}>
      <h2 id="dv-sample" className={css({ textStyle: "heading.sm" })}>
        Sample line chart
      </h2>
      <svg
        className={chartSvg()}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Line chart of pension, ISA and cash balances from 2026 to 2036, with a dashed projection and confidence band"
      >
        {[0, 100e3, 200e3, 300e3, 400e3].map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yAt(tick)}
              y2={yAt(tick)}
              stroke={chartColor("grid")}
              strokeWidth="1"
            />
            <text x={PAD.left - 8} y={yAt(tick) + 4} textAnchor="end" className={axisText()}>
              {formatAxisCurrency(tick)}
            </text>
          </g>
        ))}
        {YEARS.map((year, i) => (
          <text key={year} x={xAt(i)} y={H - 10} textAnchor="middle" className={axisText()}>
            {year}
          </text>
        ))}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={yAt(250e3)}
          y2={yAt(250e3)}
          stroke={chartColor("baseline")}
          strokeWidth="1.5"
        />
        <text x={W - PAD.right} y={yAt(250e3) - 6} textAnchor="end" className={axisText()}>
          Target £250k
        </text>
        <path
          d={`${path(BAND.upper, BAND.from)} ${[...BAND.lower]
            .reverse()
            .map((v, i) => `L${xAt(BAND.from + BAND.lower.length - 1 - i)},${yAt(v)}`)
            .join(" ")} Z`}
          fill={chartColor("band")}
        />
        {SERIES.map((s) => (
          <g key={s.name}>
            <path
              d={path(s.values)}
              fill="none"
              stroke={chartColor(s.role)}
              strokeWidth="2"
              strokeDasharray={s.dash}
            />
            {s.values.map((v, i) => (
              <Marker
                key={`${s.name}-${YEARS[i]}`}
                shape={s.marker}
                x={xAt(i)}
                y={yAt(v)}
                tone={s.role}
              />
            ))}
          </g>
        ))}
        <path
          d={path(PROJECTION.values, PROJECTION.from)}
          fill="none"
          stroke={chartColor("projection")}
          strokeWidth="2"
          strokeDasharray="8 5"
        />
      </svg>
      <ul className={legendList()} aria-label="Legend">
        {SERIES.map((s) => (
          <li key={s.name} className={legendItem()}>
            <LegendKey tone={s.role} dash={s.dash} marker={s.marker} />
            {s.name}
          </li>
        ))}
        <li className={legendItem()}>
          <LegendKey tone="projection" dash="8 5" />
          {PROJECTION.name}
        </li>
        <li className={legendItem()}>
          <LegendKey tone="baseline" />
          Target
        </li>
      </ul>
      <p className={caption()}>
        Assumes 5% annual growth. Figures are illustrative. Legend shown for 2+ series (
        {CHART_RULES.legendMinSeries}+).
      </p>
    </section>
  </div>
);

export default DataVizPalette;
