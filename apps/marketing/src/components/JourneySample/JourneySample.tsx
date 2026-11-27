import { ExampleTag, VisuallyHidden } from "@repo/ui";
import type { FC } from "react";
import { AccountTiles } from "../AccountTiles";
import { CountUpFigure } from "../CountUpFigure";
import { DrawnLineChart, type DrawnLineChartProps } from "../DrawnLineChart";
import type { JourneyStopKey } from "../JourneyStop/journeyStops";
import { Payslip } from "../Payslip";
import * as s from "./JourneySample.styles";
import {
  type ChartPoint,
  formatGbp,
  SAMPLE_ACCOUNT_CARDS,
  SAMPLE_BUDGET,
  SAMPLE_DEBT,
  SAMPLE_HOME,
  SAMPLE_PAYSLIP,
  SAMPLE_SAVINGS,
} from "./journeySamples";

/*
 * The journey's samples, one per stop, each a different way of showing the sample household's
 * figures (prototype 11's `stops/visuals.tsx`): the accounts dealt as tiles, the budget bar, the
 * payslip, a year of savings drawing itself, the debt running down and the finished Home page.
 *
 * Each renders as its finished, still self: the server render, no JavaScript and reduced motion
 * show exactly this (MK1). Its moment (`motion/journey/sampleMoments.ts`) plays inside the stop's
 * arrive and is over before the stop rests (MK3). Only figures beside an "Example" tag count, once
 * (MK13). Each root carries `data-sample` with its moment's name.
 */

const BudgetSample: FC = () => (
  <div className={`${s.panel} ${s.budget}`} data-sample="budget">
    <p className={s.budgetIn}>
      <span className={s.tagged}>
        Comes in each month <ExampleTag variant="paper" />
      </span>
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
          className={s.barSegment({ shade: Math.min(5, i) as s.BudgetShade })}
          data-bar-segment=""
          height="12"
          key={seg.id}
          width={Math.max(0, seg.share * 100 - 0.3)}
          x={seg.start * 100}
          y="0"
        />
      ))}
      <rect
        className={s.barLeftOver}
        data-bar-left=""
        height="9"
        rx="1.6"
        vectorEffect="non-scaling-stroke"
        width={Math.max(0, 100 - SAMPLE_BUDGET.leftOverStart * 100 - 2.2)}
        x={SAMPLE_BUDGET.leftOverStart * 100 + 0.9}
        y="1.5"
      />
    </svg>
    <ol aria-label="Example outgoings" className={s.rows}>
      {SAMPLE_BUDGET.segments.map((seg, i) => (
        <li className={s.row} data-budget-row="" key={seg.id}>
          <span
            aria-hidden="true"
            className={s.swatch({ shade: Math.min(5, i) as s.BudgetShade })}
          />
          <span>{seg.label}</span>
          <span>{formatGbp(seg.amount)}</span>
        </li>
      ))}
    </ol>
    <div className={s.foot}>
      <p className={s.stat} data-budget-stat="">
        <span>Left over each month</span>
        <strong>{formatGbp(SAMPLE_BUDGET.leftOver)}</strong>
      </p>
      {SAMPLE_HOME.monthsOfCover !== null && (
        <p className={s.stat} data-budget-stat="">
          <span>Breathing room</span>
          <strong>
            <CountUpFigure format="months" value={SAMPLE_HOME.monthsOfCover} />
          </strong>
        </p>
      )}
    </div>
  </div>
);

/** A chart's readouts: "£21,000, Nov" at each point. */
const readouts = (points: readonly ChartPoint[]) =>
  points.map((p) => `${formatGbp(p.value)}, ${p.when}`);

const savingsValues = SAMPLE_SAVINGS.points.map((p) => p.value);
const SAVINGS_CHART: Omit<DrawnLineChartProps, "id"> = {
  values: savingsValues,
  readouts: readouts(SAMPLE_SAVINGS.points),
  min: Math.floor((Math.min(...savingsValues) - 600) / 500) * 500,
  max: Math.ceil((Math.max(...savingsValues) + 600) / 500) * 500,
  // Four months across the year: the first, two between and now.
  ticks: [0, 4, 8, savingsValues.length - 1].map((index) => ({
    label: SAMPLE_SAVINGS.points[index]?.tick ?? "",
    index,
  })),
  tone: "sky",
};

const SavingsSample: FC = () => (
  <figure className={`${s.panel} ${s.graph}`} data-sample="savings">
    <figcaption className={s.graphHead}>
      <span className={`${s.graphTitle} ${s.tagged}`}>
        Cash savings, past year <ExampleTag variant="paper" />
      </span>
      <span className={s.graphFigure}>
        <CountUpFigure
          data-testid="journey-figure-savings"
          format="gbp"
          from={savingsValues[0]}
          value={SAMPLE_SAVINGS.end}
        />
      </span>
    </figcaption>
    <DrawnLineChart id="savings" {...SAVINGS_CHART} />
    <p className={s.graphNote}>
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
  </figure>
);

/** Each new year's first point, under the debt chart. */
const yearTicks = (points: readonly ChartPoint[]) =>
  points.flatMap((p, index) =>
    index > 0 && p.tick !== points[index - 1]?.tick ? [{ label: p.tick, index }] : [],
  );

const DEBT_CHART: Omit<DrawnLineChartProps, "id"> = {
  values: SAMPLE_DEBT.points.map((p) => p.value),
  readouts: readouts(SAMPLE_DEBT.points),
  min: 0,
  max: SAMPLE_DEBT.start || 1,
  ticks: yearTicks(SAMPLE_DEBT.points),
  tone: "violet",
};

const DebtSample: FC = () => (
  <figure className={`${s.panel} ${s.graph}`} data-sample="debt">
    <figcaption className={s.graphHead}>
      <span className={`${s.graphTitle} ${s.tagged}`}>
        Card and loan, {formatGbp(SAMPLE_DEBT.monthly)} a month <ExampleTag variant="paper" />
      </span>
      <span className={s.graphFigure}>
        <CountUpFigure data-testid="journey-figure-debt" format="gbp" value={SAMPLE_DEBT.start} />
      </span>
    </figcaption>
    <DrawnLineChart id="debt" {...DEBT_CHART} />
    <dl className={s.graphFacts}>
      <div data-graph-fact="">
        <dt>Estimated paid off</dt>
        <dd>{SAMPLE_DEBT.endLabel}</dd>
      </div>
      {SAMPLE_DEBT.fixedEndLabel && (
        <div data-graph-fact="">
          <dt>Mortgage fixed rate ends</dt>
          <dd>{SAMPLE_DEBT.fixedEndLabel}</dd>
        </div>
      )}
    </dl>
    <VisuallyHidden>
      The balance falls from {formatGbp(SAMPLE_DEBT.start)} in {SAMPLE_DEBT.startLabel} to nothing
      in {SAMPLE_DEBT.endLabel}.
    </VisuallyHidden>
  </figure>
);

const PictureSample: FC = () => (
  <figure className={`${s.panel} ${s.dash}`} data-sample="picture">
    <figcaption className={s.dashHead}>
      <span>Your Home page</span>
      <ExampleTag variant="paper" />
    </figcaption>
    <div className={s.dashTiles}>
      <p className={s.dashTile({ lead: true })} data-tile="">
        <span className={s.dashLabel({ lead: true })}>Net worth</span>
        <CountUpFigure
          className={s.dashFigure({ lead: true })}
          data-testid="journey-figure-picture-net-worth"
          format="gbp100"
          value={SAMPLE_HOME.netWorth}
        />
      </p>
      {SAMPLE_HOME.leftOverMonthly !== null && (
        <p className={s.dashTile({ lead: false })} data-tile="">
          <span className={s.dashLabel({ lead: false })}>Left over each month</span>
          <CountUpFigure
            className={s.dashFigure({ lead: false })}
            format="gbp"
            value={SAMPLE_HOME.leftOverMonthly}
          />
        </p>
      )}
      {SAMPLE_HOME.monthsOfCover !== null && (
        <p className={s.dashTile({ lead: false })} data-tile="">
          <span className={s.dashLabel({ lead: false })}>Breathing room</span>
          <CountUpFigure
            className={s.dashFigure({ lead: false })}
            format="months"
            value={SAMPLE_HOME.monthsOfCover}
          />
        </p>
      )}
    </div>
  </figure>
);

const AccountsSample: FC = () => (
  <div data-sample="accounts">
    <AccountTiles netWorth={SAMPLE_HOME.netWorth} tiles={SAMPLE_ACCOUNT_CARDS} />
  </div>
);

const PaySample: FC = () => (
  <div data-sample="pay">
    <Payslip
      gross={SAMPLE_PAYSLIP.gross}
      net={SAMPLE_PAYSLIP.net}
      rows={SAMPLE_PAYSLIP.rows}
      salary={SAMPLE_PAYSLIP.salary}
    />
  </div>
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
