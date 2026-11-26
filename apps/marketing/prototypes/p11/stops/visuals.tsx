import type { CSSProperties, FC, ReactNode } from "react";
import { BUDGET, DEBT, formatGbpPence, linePath, PAYSLIP, SAVINGS } from "../../p8/sceneData";
import type { GsapKit } from "../../shared/gsapKit";
import { Bubbles } from "../../shared/round3";
import {
  balanceOf,
  formatGbp,
  formatMonthYear,
  SAMPLE_ACCOUNTS,
  SAMPLE_DASHBOARD,
} from "../../shared/sampleData";
import type { StopKey } from "../journeyTypes";

/*
 * The journey's information components, one per stop, each a different way of showing the
 * figures: dealt account cards, the breathing room bar, the payslip, a year of savings drawing
 * itself, the debt running down and the finished Home page. Shared by prototypes 11 and 11b.
 *
 * Each renders as its finished, still self (server render, no script, reduced motion). Its
 * `build` adds its own moment to the stop's arrive timeline (see JourneyStop), so it plays while
 * the pair arrives and is complete before the rest begins: during the rest nothing moves.
 * Timeline units: the pair rises over 0 to 1; a moment runs from about 0.3 to MOMENT_END.
 *
 * Every figure is the sample household's and labelled Example.
 */

export const MOMENT_END = 2.4;

type Build = (kit: GsapKit, tl: gsap.core.Timeline, root: HTMLElement) => void;

const one = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
const FORMATS = {
  gbp: (n: number) => formatGbp(Math.round(n)),
  gbp100: (n: number) => formatGbp(Math.round(n / 100) * 100),
  months: (n: number) => `${one.format(Math.round(n * 10) / 10)} months`,
} as const;
type Format = keyof typeof FORMATS;

/** Text for screen readers only. */
export const Sr: FC<{ children: ReactNode }> = ({ children }) => (
  <span className="p11-sr">{children}</span>
);

/**
 * A figure that counts in the arrive timeline. Screen readers get the final value; the visible
 * copy is aria-hidden and shows the final value too until a script drives it.
 */
const Count: FC<{ value: number; format: Format; className?: string; id?: string }> = ({
  value,
  format,
  className,
  id,
}) => (
  <span className={`${className ?? ""} tabular-nums`}>
    <Sr>{FORMATS[format](value)}</Sr>
    <span aria-hidden="true" data-count={value} data-count-id={id} data-format={format}>
      {FORMATS[format](value)}
    </span>
  </span>
);

/** Adds a count to the timeline: from `from` to the figure's value, writing text on update. */
const countIn = (
  tl: gsap.core.Timeline,
  el: HTMLElement | null,
  at: number,
  duration: number,
  from = 0,
) => {
  if (!el) return;
  const value = Number(el.dataset.count);
  const format = FORMATS[(el.dataset.format as Format) ?? "gbp"];
  const proxy = { v: from };
  let last = "";
  tl.fromTo(
    proxy,
    { v: from },
    {
      v: value,
      duration,
      ease: "calm",
      onUpdate: () => {
        const text = format(proxy.v);
        if (text !== last) {
          last = text;
          el.textContent = text;
        }
      },
    },
    at,
  );
};

const Tag: FC<{ children?: ReactNode }> = ({ children = "Example" }) => (
  <span className="p11-v-tag">{children}</span>
);

/* ---------------------------------------------------------------------------------------------
 * Accounts: prototype 8's scene. Six cards dealt from one pile to their places, each marked "You
 * have" or "You owe", the net worth counting as each lands. Both bubble sets behind.
 *
 * Resting layout: a CSS grid (two columns, three from 34rem of its own width), so no card can
 * rest on another, and the cards shrink with the column instead of running past its edge. Only
 * cards in flight overlap, and the card dealt later is always the one on top.
 * ------------------------------------------------------------------------------------------- */

const ACCOUNT_CARDS = [
  { id: "cash", name: "Cash and savings", amount: balanceOf(SAMPLE_ACCOUNTS.savings), sign: 1 },
  { id: "pension", name: "Pension", amount: balanceOf(SAMPLE_ACCOUNTS.pension), sign: 1 },
  { id: "home", name: "Home (your estimate)", amount: balanceOf(SAMPLE_ACCOUNTS.home), sign: 1 },
  { id: "mortgage", name: "Mortgage", amount: balanceOf(SAMPLE_ACCOUNTS.mortgage), sign: -1 },
  { id: "card", name: "Credit card", amount: balanceOf(SAMPLE_ACCOUNTS.creditCard), sign: -1 },
  { id: "loan", name: "Personal loan", amount: balanceOf(SAMPLE_ACCOUNTS.loan), sign: -1 },
] as const;

const RUNNING = ACCOUNT_CARDS.reduce<number[]>((totals, card) => {
  totals.push((totals.at(-1) ?? 0) + card.sign * card.amount);
  return totals;
}, []);

const AccountsVisual: FC = () => (
  <div className="p11-v p11-v-accounts">
    <Bubbles layout="a" />
    <div className="p11-v-accounts__body">
      <ul aria-label="Example accounts" className="p11-v-cards">
        {ACCOUNT_CARDS.map((card, i) => (
          <li className="p11-v-deal" key={card.id} style={{ "--i": i } as CSSProperties}>
            <div className="p11-v-acard" data-tilt="">
              <span className="p11-v-acard__name">{card.name}</span>
              <span className="p11-v-acard__amount tabular-nums">{formatGbp(card.amount)}</span>
              <span className="p11-v-acard__kind">{card.sign < 0 ? "You owe" : "You have"}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="p11-v-total">
        <p className="p11-v-total__label">
          Net worth <Tag />
        </p>
        <p className="p11-v-total__figure">
          <Count format="gbp100" value={SAMPLE_DASHBOARD.netWorth} />
        </p>
        <p className="p11-v-total__caption">What you have minus what you owe.</p>
      </div>
    </div>
  </div>
);

const buildAccounts: Build = ({ gsap }, tl, root) => {
  const deck = root.querySelector<HTMLElement>(".p11-v-cards");
  const figure = root.querySelector<HTMLElement>(".p11-v-total [data-count]");
  if (!deck) return;
  const cards = gsap.utils.toArray<HTMLElement>(".p11-v-deal", deck);
  const toCentre = (card: HTMLElement) => ({
    x: deck.clientWidth / 2 - (card.offsetLeft + card.offsetWidth / 2),
    y: deck.clientHeight / 2 - (card.offsetTop + card.offsetHeight / 2),
  });
  const step = 0.26;
  const proxy = { v: 0 };
  let last = "";
  const write = () => {
    if (!figure) return;
    const text = FORMATS.gbp100(proxy.v);
    if (text !== last) {
      last = text;
      figure.textContent = text;
    }
  };
  cards.forEach((card, i) => {
    tl.fromTo(
      card,
      {
        x: () => toCentre(card).x,
        y: () => toCentre(card).y - i * 3,
        rotation: (i - 2.5) * 1.2,
        scale: 0.97,
        opacity: i === 0 ? 1 : 0.9,
      },
      {
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        opacity: 1,
        duration: 0.7,
        ease: "calmInOut",
        immediateRender: true,
      },
      0.3 + i * step,
    );
    tl.to(
      proxy,
      { v: RUNNING[i] ?? 0, duration: 0.5, ease: "calm", onUpdate: write },
      0.55 + i * step,
    );
  });
  write();
};

/* ---------------------------------------------------------------------------------------------
 * Budget and breathing room: prototype 8's bar. What comes in is the bar; each outgoing fills its
 * share in turn and its line comes up; what is left over is the space that remains, then the
 * breathing room counts.
 * ------------------------------------------------------------------------------------------- */

const BudgetVisual: FC = () => (
  <div className="p11-v p11-v-panel p11-v-budget" data-tilt="">
    <p className="p11-v-budget__in">
      <span>
        Comes in each month <Tag />
      </span>
      <strong className="tabular-nums">{formatGbp(BUDGET.comesIn)}</strong>
    </p>
    <div aria-hidden="true" className="p11-v-budget__bar">
      {BUDGET.segments.map((seg, i) => (
        <span
          className="p11-v-budget__seg"
          key={seg.id}
          style={
            {
              left: `${seg.start * 100}%`,
              width: `${seg.share * 100}%`,
              "--i": i,
            } as CSSProperties
          }
        />
      ))}
      <span className="p11-v-budget__left" style={{ left: `${BUDGET.leftOverStart * 100}%` }} />
    </div>
    <ol aria-label="Example outgoings" className="p11-v-budget__rows">
      {BUDGET.segments.map((seg, i) => (
        <li className="p11-v-budget__row" key={seg.id} style={{ "--i": i } as CSSProperties}>
          <span aria-hidden="true" className="p11-v-budget__swatch" />
          <span>{seg.label}</span>
          <span className="tabular-nums">{formatGbp(seg.amount)}</span>
        </li>
      ))}
    </ol>
    <div className="p11-v-budget__foot">
      <p className="p11-v-budget__stat">
        <span>Left over each month</span>
        <strong className="tabular-nums">{formatGbp(BUDGET.leftOver)}</strong>
      </p>
      {SAMPLE_DASHBOARD.monthsOfCover !== null && (
        <p className="p11-v-budget__stat">
          <span>Breathing room</span>
          <strong>
            <Count format="months" value={SAMPLE_DASHBOARD.monthsOfCover} />
          </strong>
        </p>
      )}
    </div>
  </div>
);

const buildBudget: Build = ({ gsap }, tl, root) => {
  const segments = gsap.utils.toArray<HTMLElement>(".p11-v-budget__seg", root);
  const rows = gsap.utils.toArray<HTMLElement>(".p11-v-budget__row", root);
  const step = 1.4 / Math.max(1, segments.length);
  segments.forEach((seg, i) => {
    tl.fromTo(seg, { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: "calmInOut" }, 0.3 + i * step);
    const row = rows[i];
    if (row)
      tl.fromTo(
        row,
        { opacity: 0.3, y: 6 },
        { opacity: 1, y: 0, duration: 0.4, ease: "calm" },
        0.38 + i * step,
      );
  });
  const at = 0.3 + segments.length * step;
  tl.fromTo(
    ".p11-v-budget__left",
    { scaleX: 0, opacity: 0 },
    { scaleX: 1, opacity: 1, duration: 0.4, ease: "calm" },
    at - 0.1,
  );
  tl.fromTo(
    ".p11-v-budget__stat",
    { opacity: 0, y: 10 },
    { opacity: 1, y: 0, duration: 0.4, ease: "calm", stagger: 0.12 },
    at,
  );
  countIn(tl, root.querySelector<HTMLElement>(".p11-v-budget [data-count]"), at + 0.1, 0.5);
};

/* ---------------------------------------------------------------------------------------------
 * Pay: the payslip, folded in three, opens out (prototype 5 and 8). The lower third turns down
 * from behind, then the top third turns up off the front, each shading as it turns.
 * ------------------------------------------------------------------------------------------- */

const PayVisual: FC = () => (
  <div className="p11-v p11-v-pay">
    <article aria-label="Example payslip" className="p11-v-slip">
      <div className="p11-v-slip__panel p11-v-slip__panel--top">
        <div className="p11-v-slip__face">
          <p className="p11-v-slip__head">
            <span>Payslip</span>
            <Tag>Example, one month</Tag>
          </p>
          <dl className="p11-v-slip__rows">
            <div>
              <dt>Salary</dt>
              <dd className="tabular-nums">{formatGbp(PAYSLIP.salary)} a year</dd>
            </div>
            <div>
              <dt>Pay this month</dt>
              <dd className="tabular-nums">{formatGbpPence(PAYSLIP.gross)}</dd>
            </div>
          </dl>
        </div>
        <span aria-hidden="true" className="p11-v-slip__back" />
        <span aria-hidden="true" className="p11-v-slip__shade" />
      </div>
      <div className="p11-v-slip__panel p11-v-slip__panel--middle">
        <div className="p11-v-slip__face">
          <dl className="p11-v-slip__rows">
            {PAYSLIP.rows.map((row) => (
              <div key={row.id}>
                <dt>{row.label}</dt>
                <dd className="tabular-nums">{formatGbpPence(row.amount)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="p11-v-slip__panel p11-v-slip__panel--bottom">
        <div className="p11-v-slip__face">
          <p className="p11-v-slip__net">
            <span>Take-home pay</span>
            <strong className="tabular-nums">{formatGbpPence(PAYSLIP.net)}</strong>
          </p>
          <span aria-hidden="true" className="p11-v-slip__rule" />
        </div>
        <span aria-hidden="true" className="p11-v-slip__back" />
        <span aria-hidden="true" className="p11-v-slip__shade" />
      </div>
    </article>
  </div>
);

const buildPay: Build = (_kit, tl) => {
  tl.fromTo(
    ".p11-v-slip__panel--bottom",
    { rotationX: 178 },
    { rotationX: 0, duration: 0.8, ease: "calmInOut" },
    0.3,
  )
    .fromTo(
      ".p11-v-slip__panel--bottom .p11-v-slip__shade",
      { opacity: 0.45 },
      { opacity: 0, duration: 0.8, ease: "calmInOut" },
      0.3,
    )
    .fromTo(
      ".p11-v-slip__panel--top",
      { rotationX: -178 },
      { rotationX: 0, duration: 0.8, ease: "calmInOut" },
      1.0,
    )
    .fromTo(
      ".p11-v-slip__panel--top .p11-v-slip__shade",
      { opacity: 0.45 },
      { opacity: 0, duration: 0.8, ease: "calmInOut" },
      1.0,
    )
    .fromTo(".p11-v-slip__rule", { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "calm" }, 1.8);
};

/* ---------------------------------------------------------------------------------------------
 * A line chart that draws itself, a marker riding its end with that month's figure. Used for the
 * savings year and the debt running down. Plain ink for debt: no warning colour.
 * ------------------------------------------------------------------------------------------- */

const CW = 600;
const CH = 220;

interface ChartSpec {
  id: string;
  values: number[];
  labels: string[];
  min: number;
  max: number;
  ticks: { label: string; pct: number }[];
}

const Chart: FC<{ spec: ChartSpec; tone: "sky" | "violet" }> = ({ spec, tone }) => {
  const line = linePath(spec.values, CW, CH, spec.max, spec.min);
  const area = `${line} L${CW},${CH} L0,${CH} Z`;
  const last = spec.values.length - 1;
  const lastValue = spec.values[last] ?? 0;
  return (
    <div
      className="p11-v-chart"
      data-chart={spec.id}
      data-labels={spec.labels.join("|")}
      data-max={spec.max}
      data-min={spec.min}
      data-tone={tone}
      data-values={spec.values.join(",")}
    >
      <svg aria-hidden="true" preserveAspectRatio="none" viewBox={`0 -8 ${CW} ${CH + 16}`}>
        <defs>
          <clipPath id={`p11-clip-${spec.id}`}>
            <rect height={CH + 32} width={CW} x="0" y="-16" />
          </clipPath>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line className="p11-v-chart__grid" key={g} x1="0" x2={CW} y1={CH * g} y2={CH * g} />
        ))}
        <line className="p11-v-chart__base" x1="0" x2={CW} y1={CH} y2={CH} />
        <g clipPath={`url(#p11-clip-${spec.id})`}>
          <path className="p11-v-chart__area" d={area} />
          <path className="p11-v-chart__line" d={line} vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
      <span
        aria-hidden="true"
        className="p11-v-chart__dot"
        style={
          {
            left: "100%",
            top: `${(1 - (lastValue - spec.min) / (spec.max - spec.min)) * 100}%`,
          } as CSSProperties
        }
      >
        <span className="p11-v-chart__readout tabular-nums">{spec.labels[last]}</span>
      </span>
      <ol aria-hidden="true" className="p11-v-chart__ticks">
        {spec.ticks.map((t) => (
          <li key={t.label} style={{ left: `${t.pct}%` }}>
            {t.label}
          </li>
        ))}
      </ol>
    </div>
  );
};

/** The line draws (its clip widens), the marker rides its end and the readout follows. */
const buildChart = (
  { gsap }: GsapKit,
  tl: gsap.core.Timeline,
  root: HTMLElement,
  at: number,
  duration: number,
) => {
  const chart = root.querySelector<HTMLElement>(".p11-v-chart");
  const clip = chart?.querySelector<SVGRectElement>("clipPath rect");
  const dot = chart?.querySelector<HTMLElement>(".p11-v-chart__dot");
  const readout = chart?.querySelector<HTMLElement>(".p11-v-chart__readout");
  if (!chart || !clip || !dot || !readout) return;
  const values = (chart.dataset.values ?? "").split(",").map(Number);
  const labels = (chart.dataset.labels ?? "").split("|");
  const min = Number(chart.dataset.min);
  const max = Number(chart.dataset.max);
  const state = { p: 1 };
  let lastI = -1;
  const place = () => {
    const f = state.p * (values.length - 1);
    const i = Math.min(values.length - 2, Math.floor(f));
    const t = f - i;
    const v = (values[i] ?? 0) * (1 - t) + (values[i + 1] ?? 0) * t;
    dot.style.left = `${state.p * 100}%`;
    dot.style.top = `${(1 - (v - min) / (max - min)) * 100}%`;
    clip.setAttribute("width", String(state.p * CW));
    const month = Math.round(f);
    if (month !== lastI) {
      lastI = month;
      readout.textContent = labels[month] ?? "";
    }
    dot.dataset.flip = String(state.p > 0.5);
  };
  tl.fromTo(
    state,
    { p: 0 },
    { p: 1, duration, ease: "calmInOut", onUpdate: place, immediateRender: true },
    at,
  );
  gsap.set(dot, { opacity: 1 });
};

/* ----- Savings: a year of balances ----- */

/** The budget's monthly cash saving (sceneData works the history back from it). */
const CASH_SAVING = BUDGET.segments.find((s) => s.label === "Cash saving")?.amount ?? 0;

const sValues = SAVINGS.points.map((p) => p.value);
const SAVINGS_SPEC: ChartSpec = {
  id: "savings",
  values: sValues,
  labels: SAVINGS.points.map((p) => `${formatGbp(p.value)}, ${p.label}`),
  min: Math.floor((Math.min(...sValues) - 600) / 500) * 500,
  max: Math.ceil((Math.max(...sValues) + 600) / 500) * 500,
  ticks: [0, 4, 8, 11].map((i) => ({
    label: SAVINGS.points[i]?.label ?? "",
    pct: (i / (sValues.length - 1)) * 100,
  })),
};

const SavingsVisual: FC = () => (
  <figure className="p11-v p11-v-panel p11-v-graph" data-tilt="">
    <figcaption className="p11-v-graph__head">
      <span className="p11-v-graph__title">
        Cash savings, past year <Tag />
      </span>
      <span className="p11-v-graph__figure">
        <Count format="gbp" value={SAVINGS.end} />
      </span>
    </figcaption>
    <Chart spec={SAVINGS_SPEC} tone="sky" />
    <p className="p11-v-graph__note">
      Each month adds {formatGbp(CASH_SAVING)} of saving and a little interest. In August{" "}
      {formatGbp(1200)} was taken out.
    </p>
    <Sr>
      Monthly balances: {SAVINGS.points.map((p) => `${p.long} ${formatGbp(p.value)}`).join(", ")}.
    </Sr>
  </figure>
);

const buildSavings: Build = (kit, tl, root) => {
  buildChart(kit, tl, root, 0.3, 1.8);
  countIn(
    tl,
    root.querySelector<HTMLElement>(".p11-v-graph__figure [data-count]"),
    0.3,
    1.8,
    sValues[0],
  );
};

/* ----- Debt: the card and the loan, running down to the end date ----- */

const dValues = DEBT.points.map((p) => p.value);
const DEBT_SPEC: ChartSpec = {
  id: "debt",
  values: dValues,
  labels: DEBT.points.map((p) => `${formatGbp(Math.round(p.value))}, ${p.long}`),
  min: 0,
  max: DEBT.start,
  ticks: DEBT.points
    .map((p, i) => ({ ...p, i }))
    .filter((p) => p.month === 0)
    .map((p) => ({ label: String(p.year), pct: (p.i / (dValues.length - 1)) * 100 })),
};

const fixedEnd = SAMPLE_ACCOUNTS.mortgage?.fixedRateEndDate;

const DebtVisual: FC = () => (
  <figure className="p11-v p11-v-panel p11-v-graph" data-tilt="">
    <figcaption className="p11-v-graph__head">
      <span className="p11-v-graph__title">
        Card and loan, {formatGbp(DEBT.monthly)} a month <Tag />
      </span>
      <span className="p11-v-graph__figure">
        <Count format="gbp" value={DEBT.start} />
      </span>
    </figcaption>
    <Chart spec={DEBT_SPEC} tone="violet" />
    <dl className="p11-v-graph__facts">
      <div>
        <dt>Estimated paid off</dt>
        <dd className="tabular-nums">{DEBT.endLabel}</dd>
      </div>
      {fixedEnd && (
        <div>
          <dt>Mortgage fixed rate ends</dt>
          <dd className="tabular-nums">{formatMonthYear(fixedEnd)}</dd>
        </div>
      )}
    </dl>
    <Sr>
      The balance falls from {formatGbp(DEBT.start)} in {DEBT.startLabel} to nothing in{" "}
      {DEBT.endLabel}.
    </Sr>
  </figure>
);

const buildDebt: Build = (kit, tl, root) => {
  buildChart(kit, tl, root, 0.3, 1.8);
  countIn(tl, root.querySelector<HTMLElement>(".p11-v-graph__figure [data-count]"), 0.3, 0.9);
  tl.fromTo(
    root.querySelectorAll(".p11-v-graph__facts > div"),
    { opacity: 0, y: 8 },
    { opacity: 1, y: 0, duration: 0.4, ease: "calm", stagger: 0.12 },
    1.9,
  );
};

/* ---------------------------------------------------------------------------------------------
 * The picture: the Home page's three figures, counting, each tile arriving in turn.
 * ------------------------------------------------------------------------------------------- */

const DashboardVisual: FC = () => (
  <figure className="p11-v p11-v-panel p11-v-dash" data-tilt="">
    <figcaption className="p11-v-dash__head">
      <span>Your Home page</span>
      <Tag />
    </figcaption>
    <div className="p11-v-dash__tiles">
      <p className="p11-v-dash__tile p11-v-dash__tile--hero">
        <span className="p11-v-dash__label">Net worth</span>
        <Count className="p11-v-dash__figure" format="gbp100" value={SAMPLE_DASHBOARD.netWorth} />
      </p>
      {SAMPLE_DASHBOARD.leftOverMonthly !== null && (
        <p className="p11-v-dash__tile">
          <span className="p11-v-dash__label">Left over each month</span>
          <Count
            className="p11-v-dash__figure"
            format="gbp"
            value={SAMPLE_DASHBOARD.leftOverMonthly}
          />
        </p>
      )}
      {SAMPLE_DASHBOARD.monthsOfCover !== null && (
        <p className="p11-v-dash__tile">
          <span className="p11-v-dash__label">Breathing room</span>
          <Count
            className="p11-v-dash__figure"
            format="months"
            value={SAMPLE_DASHBOARD.monthsOfCover}
          />
        </p>
      )}
    </div>
  </figure>
);

const buildDashboard: Build = ({ gsap }, tl, root) => {
  const tiles = gsap.utils.toArray<HTMLElement>(".p11-v-dash__tile", root);
  tiles.forEach((tile, i) => {
    tl.fromTo(
      tile,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.6, ease: "calm" },
      0.3 + i * 0.25,
    );
    countIn(tl, tile.querySelector<HTMLElement>("[data-count]"), 0.4 + i * 0.25, 1.3);
  });
};

export const STOP_VISUALS: Record<StopKey, { Visual: FC; build: Build }> = {
  accounts: { Visual: AccountsVisual, build: buildAccounts },
  budget: { Visual: BudgetVisual, build: buildBudget },
  pay: { Visual: PayVisual, build: buildPay },
  "savings-and-pension": { Visual: SavingsVisual, build: buildSavings },
  "debt-and-borrowing": { Visual: DebtVisual, build: buildDebt },
  dashboard: { Visual: DashboardVisual, build: buildDashboard },
};
