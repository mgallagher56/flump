import type { FC, ReactNode } from "react";
import { DEBT, formatGbpPence, PAYSLIP, SAVINGS } from "../p5/data";
import { CountTo } from "../shared/round3";
import {
  balanceOf,
  formatGbp,
  formatMonthYear,
  SAMPLE_ACCOUNTS,
  SAMPLE_BUDGET,
  SAMPLE_DASHBOARD,
} from "../shared/sampleData";

/*
 * The journey's visuals, one per stop, each a different way of showing the figures: a card, a
 * short list, the payslip, a chart, a counting figure and the finished Home page. Each renders in
 * normal flow as the finished, still version (what shows before scripts, under reduced motion and
 * on a weak device). The 3D scene clones it: every `data-part` becomes a piece that comes together
 * as the camera arrives, then the piece plays its own moment on time (bars grow, the payslip
 * unfolds, the line draws, figures count). Hooks for the scene:
 *
 *   data-part            a piece that travels on its own
 *   data-bar             a bar that grows from the left (list)
 *   data-fold            a payslip panel: top, middle or bottom
 *   data-draw            an SVG path that draws itself (needs pathLength="1")
 *   data-fade            fades in after the line has drawn
 *   data-count, -format  a figure that counts to its value (format "gbp" or "months")
 *
 * Every figure is the sample household's and labelled Example.
 */

export type StopKind = "card" | "list" | "payslip" | "chart" | "count" | "dashboard";

const one = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
export const COUNT_FORMATS = {
  gbp: (n: number) => formatGbp(Math.round(n)),
  months: (n: number) => `${one.format(Math.round(n * 10) / 10)} months`,
} as const;
export type CountFormat = keyof typeof COUNT_FORMATS;

const Card: FC<{ title: string; kind: StopKind; wide?: boolean; children: ReactNode }> = ({
  title,
  kind,
  wide,
  children,
}) => (
  <figure className={wide ? "p9-card p9-card--wide" : "p9-card"} data-kind={kind} data-stop-card="">
    <figcaption className="p9-card__head" data-part="">
      <span className="p9-card__title">{title}</span>
      <span className="p9-card__tag">Example</span>
    </figcaption>
    {children}
  </figure>
);

const Row: FC<{ label: string; value: string; note?: string }> = ({ label, value, note }) => (
  <p className="p9-card__row" data-part="">
    <span className="p9-card__label">
      {label}
      {note && <span className="p9-card__note">{note}</span>}
    </span>
    <span className="p9-card__value tabular-nums">{value}</span>
  </p>
);

/** A figure that counts: the still counts with CountTo, the 3D copy is driven by the scene. */
const Counting: FC<{ value: number; format: CountFormat; className: string }> = ({
  value,
  format,
  className,
}) => (
  <span className={className} data-count={value} data-format={format}>
    <CountTo format={COUNT_FORMATS[format]} value={value} />
  </span>
);

/* ----- Accounts: a card, its rows arriving one by one ----- */

const cardAndLoan = balanceOf(SAMPLE_ACCOUNTS.creditCard) + balanceOf(SAMPLE_ACCOUNTS.loan);

const AccountsVisual: FC = () => (
  <Card kind="card" title="Accounts">
    <Row label="Cash and emergency savings" value={formatGbp(balanceOf(SAMPLE_ACCOUNTS.savings))} />
    <Row label="Pensions" value={formatGbp(balanceOf(SAMPLE_ACCOUNTS.pension))} />
    <Row label="Home (your estimate)" value={formatGbp(balanceOf(SAMPLE_ACCOUNTS.home))} />
    <Row label="Mortgage" value={formatGbp(balanceOf(SAMPLE_ACCOUNTS.mortgage))} />
    <Row label="Card and loan" value={formatGbp(cardAndLoan)} />
  </Card>
);

/* ----- Budget: a short list, each line's bar its share of what comes in ----- */

const OUTGOINGS = [...SAMPLE_BUDGET.outgoings].sort((a, b) => b.amount - a.amount).slice(0, 4);
const otherOut = SAMPLE_BUDGET.goesOut - OUTGOINGS.reduce((sum, o) => sum + o.amount, 0);

const ListLine: FC<{ label: string; amount: number }> = ({ label, amount }) => (
  <li className="p9-list__item" data-part="">
    <span className="p9-list__label">{label}</span>
    <span className="p9-list__value tabular-nums">{formatGbp(amount)}</span>
    <span aria-hidden="true" className="p9-list__track">
      <span
        className="p9-list__bar"
        data-bar=""
        style={{ width: `${(amount / SAMPLE_BUDGET.comesIn) * 100}%` }}
      />
    </span>
  </li>
);

const BudgetVisual: FC = () => (
  <Card kind="list" title={`Budget, of ${formatGbp(SAMPLE_BUDGET.comesIn)} a month`}>
    <ul className="p9-list">
      {OUTGOINGS.map((entry) => (
        <ListLine amount={entry.amount} key={entry.id} label={entry.label} />
      ))}
      {otherOut > 0 && <ListLine amount={otherOut} label="Everything else" />}
    </ul>
    <p className="p9-card__total" data-part="">
      <span className="p9-card__label">Left over each month</span>
      <span className="p9-card__big tabular-nums">{formatGbp(SAMPLE_BUDGET.leftOver)}</span>
    </p>
  </Card>
);

/* ----- Pay: the payslip, folded in three, opening out ----- */

const PayVisual: FC = () => (
  <article aria-label="Example payslip" className="p9-slip" data-kind="payslip" data-stop-card="">
    <div className="p9-slip__panel p9-slip__panel--top" data-fold="top">
      <p className="p9-slip__head">
        <span>Payslip</span>
        <span className="p9-card__tag">Example, one month</span>
      </p>
      <dl className="p9-slip__rows">
        <div>
          <dt>Salary</dt>
          <dd className="tabular-nums">{formatGbp(PAYSLIP.salary)} a year</dd>
        </div>
        <div>
          <dt>Pay this month</dt>
          <dd className="tabular-nums">{formatGbpPence(PAYSLIP.gross)}</dd>
        </div>
      </dl>
      <span aria-hidden="true" className="p9-slip__shade" />
    </div>
    <div className="p9-slip__panel p9-slip__panel--middle" data-fold="middle">
      <dl className="p9-slip__rows">
        {PAYSLIP.rows.map((row) => (
          <div key={row.id}>
            <dt>{row.label}</dt>
            <dd className="tabular-nums">{formatGbpPence(row.amount)}</dd>
          </div>
        ))}
      </dl>
    </div>
    <div className="p9-slip__panel p9-slip__panel--bottom" data-fold="bottom">
      <p className="p9-slip__net">
        <span>Take-home pay</span>
        <strong className="tabular-nums">{formatGbpPence(PAYSLIP.net)}</strong>
      </p>
      <span aria-hidden="true" className="p9-slip__shade" />
    </div>
  </article>
);

/* ----- Savings: a year of balances, the line drawing itself ----- */

const W = 320;
const H = 120;
const values = SAVINGS.points.map((p) => p.value);
const MIN = Math.floor((Math.min(...values) - 400) / 500) * 500;
const MAX = Math.ceil((Math.max(...values) + 300) / 500) * 500;
const xAt = (i: number) => (i / (values.length - 1)) * W;
const yAt = (v: number) => H - ((v - MIN) / (MAX - MIN)) * H;
const LINE = values
  .map((v, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`)
  .join(" ");
const AREA = `${LINE} L${W},${H} L0,${H} Z`;
const lastValue = values.at(-1) ?? 0;

const SavingsVisual: FC = () => (
  <Card kind="chart" title="Cash savings, past year">
    <div className="p9-chart" data-part="">
      <svg aria-hidden="true" className="p9-chart__svg" viewBox={`-6 -10 ${W + 12} ${H + 14}`}>
        {[0.25, 0.5, 0.75].map((g) => (
          <line className="p9-chart__grid" key={g} x1="0" x2={W} y1={H * g} y2={H * g} />
        ))}
        <line className="p9-chart__base" x1="0" x2={W} y1={H} y2={H} />
        <path className="p9-chart__area" d={AREA} data-fade="" />
        <path className="p9-chart__line" d={LINE} data-draw="" pathLength={1} />
        <circle
          className="p9-chart__dot"
          cx={xAt(values.length - 1)}
          cy={yAt(lastValue)}
          data-fade=""
          r="5"
        />
      </svg>
      <p className="p9-chart__axis" aria-hidden="true">
        <span>{SAVINGS.points[0]?.label}</span>
        <span>{SAVINGS.points.at(-1)?.label}</span>
      </p>
      <p className="p9-sr">
        Monthly balances: {SAVINGS.points.map((p) => `${p.long} ${formatGbp(p.value)}`).join(", ")}.
      </p>
    </div>
    <p className="p9-card__total" data-part="">
      <span className="p9-card__label">Balance now, {SAVINGS.points.at(-1)?.long}</span>
      <Counting className="p9-card__big" format="gbp" value={lastValue} />
    </p>
  </Card>
);

/* ----- Debt: one figure, counted, with the plan under it ----- */

const fixedEnd = SAMPLE_ACCOUNTS.mortgage?.fixedRateEndDate;

const DebtVisual: FC = () => (
  <Card kind="count" title="Card and loan">
    <p className="p9-figure" data-part="">
      <span className="p9-card__label">Owed on the card and loan</span>
      <Counting className="p9-figure__value" format="gbp" value={DEBT.start} />
    </p>
    <Row label="Paid each month" value={formatGbp(DEBT.monthly)} />
    <Row label="Paid off, estimate" value={DEBT.endLabel} />
    {fixedEnd && <Row label="Mortgage fixed rate ends" value={formatMonthYear(fixedEnd)} />}
  </Card>
);

/* ----- The picture: the Home page's three figures ----- */

const DashboardVisual: FC = () => (
  <Card kind="dashboard" title="Your Home page" wide>
    <div className="p9-dash">
      <p className="p9-dash__tile" data-part="">
        <span className="p9-card__label">Net worth</span>
        <Counting className="p9-dash__figure" format="gbp" value={SAMPLE_DASHBOARD.netWorth} />
      </p>
      {SAMPLE_DASHBOARD.leftOverMonthly !== null && (
        <p className="p9-dash__tile" data-part="">
          <span className="p9-card__label">Left over each month</span>
          <Counting
            className="p9-dash__figure"
            format="gbp"
            value={SAMPLE_DASHBOARD.leftOverMonthly}
          />
        </p>
      )}
      {SAMPLE_DASHBOARD.monthsOfCover !== null && (
        <p className="p9-dash__tile" data-part="">
          <span className="p9-card__label">Breathing room</span>
          <Counting
            className="p9-dash__figure"
            format="months"
            value={SAMPLE_DASHBOARD.monthsOfCover}
          />
        </p>
      )}
    </div>
  </Card>
);

export const STOP_VISUALS = {
  accounts: AccountsVisual,
  budget: BudgetVisual,
  pay: PayVisual,
  "savings-and-pension": SavingsVisual,
  "debt-and-borrowing": DebtVisual,
  dashboard: DashboardVisual,
} as const;
