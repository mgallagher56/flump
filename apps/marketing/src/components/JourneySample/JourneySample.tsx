import { Card, ExampleTag, VisuallyHidden } from "@repo/ui";
import type { FC } from "react";
import { JourneyFigure } from "../JourneyFigure";
import type { JourneyStopKey } from "../JourneyStop/journeyStops";
import * as s from "./JourneySample.styles";
import {
  CHART_BOX,
  type ChartPoint,
  chartY,
  formatGbp,
  formatGbpHundreds,
  formatGbpPence,
  formatMonths,
  linePath,
  SAMPLE_ACCOUNT_CARDS,
  SAMPLE_BUDGET,
  SAMPLE_DEBT,
  SAMPLE_HOME,
  SAMPLE_PAYSLIP,
  SAMPLE_SAVINGS,
} from "./journeySamples";

/*
 * The journey's samples, one per stop, each a different way of showing the sample household's
 * figures: account cards dealt into place, the budget bar, the payslip, a year of savings, the
 * debt running down and the finished Home page. Ported from prototype 11's `stops/visuals.tsx`.
 *
 * Each renders as its finished, still self: the server render, no JavaScript and reduced motion
 * show exactly this (MK1). The stop's arrive moment (`motion/journey/sampleMoments.ts`) plays over
 * the `data-*` hooks below and is over before the stop rests (MK3). Only the figure beside each
 * card's "Example" tag may count up, once (MK13).
 */

const Head: FC<{ label: string }> = ({ label }) => (
  <p className={s.head}>
    <span>{label}</span>
    <ExampleTag variant="paper" />
  </p>
);

const AccountsSample: FC = () => (
  <Card className={s.sample} data-sample="accounts" material="paper" padding="lg">
    <Head label="Your accounts" />
    <ul aria-label="Example accounts" className={s.deck} data-deck="">
      {SAMPLE_ACCOUNT_CARDS.map((card) => (
        <li className={s.accountCard} data-deal="" key={card.id}>
          <span className={s.accountName}>{card.name}</span>
          <span className={s.accountAmount}>{formatGbp(card.amount)}</span>
          <span className={s.accountKind}>{card.owed ? "You owe" : "You have"}</span>
        </li>
      ))}
    </ul>
    <div className={s.total}>
      <p className={s.totalLabel}>Net worth</p>
      <p className={s.bigFigure}>
        <JourneyFigure
          data-testid="journey-figure-net-worth"
          format={formatGbpHundreds}
          value={SAMPLE_HOME.netWorth}
        />
      </p>
      <p className={s.caption}>What you have minus what you owe.</p>
    </div>
  </Card>
);

const BudgetSample: FC = () => (
  <Card className={s.sample} data-sample="budget" material="paper" padding="lg">
    <Head label="Your budget" />
    <p className={s.amountRow}>
      <span>Comes in each month</span>
      <strong>{formatGbp(SAMPLE_BUDGET.comesIn)}</strong>
    </p>
    <svg
      aria-hidden="true"
      className={s.bar}
      focusable="false"
      preserveAspectRatio="none"
      viewBox="0 0 100 12"
    >
      {SAMPLE_BUDGET.segments.map((seg, i) => (
        <rect
          className={s.barSegment({ shade: i % 2 === 0 ? "strong" : "soft" })}
          data-bar-segment=""
          height="12"
          key={seg.id}
          width={seg.share * 100}
          x={seg.start * 100}
          y="0"
        />
      ))}
      <rect
        className={s.barLeftOver}
        data-bar-left=""
        height="12"
        width={Math.max(0, 100 - SAMPLE_BUDGET.leftOverStart * 100)}
        x={SAMPLE_BUDGET.leftOverStart * 100}
        y="0"
      />
    </svg>
    <ol aria-label="Example outgoings" className={s.rows}>
      {SAMPLE_BUDGET.segments.map((seg) => (
        <li className={s.row} data-budget-row="" key={seg.id}>
          <span>{seg.label}</span>
          <span>{formatGbp(seg.amount)}</span>
        </li>
      ))}
    </ol>
    <div className={s.stats}>
      <p className={s.stat}>
        <span>Left over each month</span>
        <strong>{formatGbp(SAMPLE_BUDGET.leftOver)}</strong>
      </p>
      {SAMPLE_HOME.monthsOfCover !== null && (
        <p className={s.stat}>
          <span>Breathing room</span>
          <strong>{formatMonths(SAMPLE_HOME.monthsOfCover)}</strong>
        </p>
      )}
    </div>
  </Card>
);

const PaySample: FC = () => (
  <article aria-label="Example payslip" className={s.slip} data-sample="pay">
    <div className={s.slipPanel({ fold: "top" })} data-fold="top">
      <p className={s.slipTitle}>
        <span>Payslip, one month</span>
        <ExampleTag variant="paper" />
      </p>
      <dl className={s.slipRows}>
        <div>
          <dt>Salary</dt>
          <dd>{formatGbp(SAMPLE_PAYSLIP.salary)} a year</dd>
        </div>
        <div>
          <dt>Pay this month</dt>
          <dd>{formatGbpPence(SAMPLE_PAYSLIP.gross)}</dd>
        </div>
      </dl>
    </div>
    <div className={s.slipPanel({ fold: "middle" })}>
      <dl className={s.slipRows}>
        {SAMPLE_PAYSLIP.rows.map((row) => (
          <div key={row.id}>
            <dt>{row.label}</dt>
            <dd>{formatGbpPence(row.amount)}</dd>
          </div>
        ))}
      </dl>
    </div>
    <div className={s.slipPanel({ fold: "bottom" })} data-fold="bottom">
      <p className={s.slipNet}>
        <span>Take-home pay</span>
        <strong>{formatGbpPence(SAMPLE_PAYSLIP.net)}</strong>
      </p>
    </div>
  </article>
);

interface ChartSpec {
  readonly points: readonly ChartPoint[];
  readonly min: number;
  readonly max: number;
  readonly tone: "wealth" | "debt";
  readonly ticks: readonly string[];
}

/** A line chart on the sample box; the marker sits on the last point. Hidden from assistive technology: the caption and the list beside it carry the figures. */
const LineChart: FC<{ spec: ChartSpec; id: string }> = ({ spec, id }) => {
  const values = spec.points.map((p) => p.value);
  const line = linePath(values, spec.max, spec.min);
  const area = `${line} L${CHART_BOX.width},${CHART_BOX.height} L0,${CHART_BOX.height} Z`;
  const lastY = chartY(values.at(-1) ?? 0, spec.max, spec.min);
  const clipId = `journey-chart-${id}`;
  return (
    <div className={s.chart}>
      <svg
        aria-hidden="true"
        className={s.chartSvg}
        focusable="false"
        viewBox={`0 -10 ${CHART_BOX.width} ${CHART_BOX.height + 20}`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect
              data-chart-clip=""
              height={CHART_BOX.height + 40}
              width={CHART_BOX.width + 20}
              x="-10"
              y="-20"
            />
          </clipPath>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            className={s.chartGrid}
            key={g}
            x1="0"
            x2={CHART_BOX.width}
            y1={CHART_BOX.height * g}
            y2={CHART_BOX.height * g}
          />
        ))}
        <line
          className={s.chartBase}
          x1="0"
          x2={CHART_BOX.width}
          y1={CHART_BOX.height}
          y2={CHART_BOX.height}
        />
        <g clipPath={`url(#${clipId})`}>
          <path className={s.chartArea({ tone: spec.tone })} d={area} />
          <path
            className={s.chartLine({ tone: spec.tone })}
            d={line}
            vectorEffect="non-scaling-stroke"
          />
        </g>
        <circle
          className={s.chartMarker({ tone: spec.tone })}
          cx={CHART_BOX.width}
          cy={lastY}
          data-chart-marker=""
          r="8"
        />
      </svg>
      <ol aria-hidden="true" className={s.ticks}>
        {spec.ticks.map((tick) => (
          <li key={tick}>{tick}</li>
        ))}
      </ol>
    </div>
  );
};

const evenTicks = (points: readonly { tick: string }[]) => {
  const picks = [0, Math.floor((points.length - 1) / 2), points.length - 1];
  return [...new Set(picks.map((i) => points[i]?.tick ?? ""))];
};

const savingsValues = SAMPLE_SAVINGS.points.map((p) => p.value);
const SAVINGS_SPEC: ChartSpec = {
  points: SAMPLE_SAVINGS.points,
  min: Math.floor((Math.min(...savingsValues) - 600) / 500) * 500,
  max: Math.ceil((Math.max(...savingsValues) + 600) / 500) * 500,
  tone: "wealth",
  ticks: evenTicks(SAMPLE_SAVINGS.points),
};

const SavingsSample: FC = () => (
  <Card as="article" className={s.sample} data-sample="savings" material="paper" padding="lg">
    <Head label="Cash savings, past year" />
    <p className={s.bigFigure}>
      <JourneyFigure
        data-testid="journey-figure-savings"
        format={formatGbp}
        from={savingsValues[0]}
        value={SAMPLE_SAVINGS.end}
      />
    </p>
    <LineChart id="savings" spec={SAVINGS_SPEC} />
    <p className={s.caption}>
      Each month adds {formatGbp(SAMPLE_SAVINGS.saving)} of saving and a little interest. In August{" "}
      {formatGbp(SAMPLE_SAVINGS.withdrawal)} was taken out.
    </p>
    <VisuallyHidden as="div">
      <ol aria-label="Example monthly balances">
        {SAMPLE_SAVINGS.points.map((p) => (
          <li key={p.label}>{p.label}</li>
        ))}
      </ol>
    </VisuallyHidden>
  </Card>
);

const DEBT_SPEC: ChartSpec = {
  points: SAMPLE_DEBT.points,
  min: 0,
  max: SAMPLE_DEBT.start || 1,
  tone: "debt",
  ticks: [...new Set(SAMPLE_DEBT.points.map((p) => p.tick))],
};

const DebtSample: FC = () => (
  <Card as="article" className={s.sample} data-sample="debt" material="paper" padding="lg">
    <Head label={`Card and loan, ${formatGbp(SAMPLE_DEBT.monthly)} a month`} />
    <p className={s.bigFigure}>{formatGbp(SAMPLE_DEBT.start)}</p>
    <LineChart id="debt" spec={DEBT_SPEC} />
    <dl className={s.facts}>
      <div>
        <dt>Estimated paid off</dt>
        <dd>{SAMPLE_DEBT.endLabel}</dd>
      </div>
      {SAMPLE_DEBT.fixedEndLabel && (
        <div>
          <dt>Mortgage fixed rate ends</dt>
          <dd>{SAMPLE_DEBT.fixedEndLabel}</dd>
        </div>
      )}
    </dl>
    <VisuallyHidden>
      The balance falls from {formatGbp(SAMPLE_DEBT.start)} in {SAMPLE_DEBT.startLabel} to nothing
      in {SAMPLE_DEBT.endLabel}.
    </VisuallyHidden>
  </Card>
);

const PictureSample: FC = () => (
  <Card as="article" className={s.sample} data-sample="picture" material="paper" padding="lg">
    <Head label="Your Home page" />
    <div className={s.tiles}>
      <p className={s.tile({ lead: true })} data-tile="">
        <span className={s.tileLabel}>Net worth</span>
        <JourneyFigure
          className={s.tileFigure({ lead: true })}
          data-testid="journey-figure-picture-net-worth"
          format={formatGbpHundreds}
          value={SAMPLE_HOME.netWorth}
        />
      </p>
      {SAMPLE_HOME.leftOverMonthly !== null && (
        <p className={s.tile({ lead: false })} data-tile="">
          <span className={s.tileLabel}>Left over each month</span>
          <span className={s.tileFigure({ lead: false })}>
            {formatGbp(SAMPLE_HOME.leftOverMonthly)}
          </span>
        </p>
      )}
      {SAMPLE_HOME.monthsOfCover !== null && (
        <p className={s.tile({ lead: false })} data-tile="">
          <span className={s.tileLabel}>Breathing room</span>
          <span className={s.tileFigure({ lead: false })}>
            {formatMonths(SAMPLE_HOME.monthsOfCover)}
          </span>
        </p>
      )}
    </div>
  </Card>
);

const SAMPLES: Record<JourneyStopKey, FC> = {
  accounts: AccountsSample,
  budget: BudgetSample,
  pay: PaySample,
  "savings-and-pension": SavingsSample,
  "debt-and-borrowing": DebtSample,
  picture: PictureSample,
};

export interface JourneySampleProps {
  stop: JourneyStopKey;
}

/** The sample beside one journey stop. */
export const JourneySample: FC<JourneySampleProps> = ({ stop }) => {
  const Sample = SAMPLES[stop];
  return <Sample />;
};
