import {
  calculateAvalanche,
  calculateSnowball,
  type DebtItem,
  type PayoffResult,
} from "@flump/finance-engine";
import { type FC, type HTMLAttributes, type ReactNode, useEffect, useMemo, useState } from "react";
import { cx } from "../../../styled-system/css";
import { formatAxisCurrency } from "../../charts/formatAxisCurrency";
import { ChartFigure } from "../../patterns/ChartFigure/ChartFigure";
import { EmptyState } from "../../patterns/EmptyState/EmptyState";
import { HeroFigure } from "../../patterns/HeroFigure/HeroFigure";
import { KpiStrip } from "../../patterns/KpiStrip/KpiStrip";
import { PageHeader } from "../../patterns/PageHeader/PageHeader";
import { ProjectionNotice } from "../../patterns/ProjectionNotice/ProjectionNotice";
import { ScenarioZone } from "../../patterns/ScenarioZone/ScenarioZone";
import { SimulatorSplitLayout } from "../../patterns/SimulatorSplitLayout/SimulatorSplitLayout";
import { Button } from "../../primitives/Button/Button";
import { Card } from "../../primitives/Card/Card";
import { Checkbox } from "../../primitives/Checkbox/Checkbox";
import { CollapsibleDrawer } from "../../primitives/CollapsibleDrawer/CollapsibleDrawer";
import { CurrencyInput } from "../../primitives/CurrencyInput/CurrencyInput";
import { controlProps, FormField } from "../../primitives/FormField/FormField";
import { Illustration } from "../../primitives/Illustration/Illustration";
import { KpiCard } from "../../primitives/KpiCard/KpiCard";
import { formatMoney, Money } from "../../primitives/Money/Money";
import { RadioCardGroup } from "../../primitives/RadioCardGroup/RadioCardGroup";
import { Select } from "../../primitives/Select/Select";
import { Skeleton } from "../../primitives/Skeleton/Skeleton";
import { SliderField } from "../../primitives/SliderField/SliderField";
import { Switch } from "../../primitives/Switch/Switch";
import { Table, TBody, Td, THead, Th } from "../../primitives/Table/Table";
import { Tabs } from "../../primitives/Tabs/Tabs";
import { TextInput } from "../../primitives/TextInput/TextInput";
import { VisuallyHidden } from "../../primitives/VisuallyHidden/VisuallyHidden";
import {
  buttonRow,
  cardHeader,
  cardTitle,
  centred,
  chartAxisText,
  chartBand,
  chartGrid,
  chartLine,
  chartProjectionLine,
  chartSvg,
  detailsList,
  detailsRow,
  figureText,
  formFull,
  formGrid,
  listItemButton,
  listItemMeta,
  listReset,
  mutedText,
  outcome,
  outcomeLabel,
  outcomeSupport,
  outcomeSupportItem,
  outcomeValue,
  page,
  pageBody,
  pageSkeletonCard,
  pageSkeletonHeader,
  pageSkeletonHero,
  pageSkeletonKpis,
  plainLink,
  proseText,
  split,
  splitDetail,
  splitList,
  stack,
  toolStack,
} from "./PageTemplates.styles";

/**
 * Page templates: compositions of the kit that anchor visual regression and show how a screen is
 * put together. Each page PR matches them (E16 plan P1 to P13). They hold no business logic of
 * their own. Every figure is derived from the sample rows below (or from `@flump/finance-engine`
 * for the simulator), never typed in twice, and each page says it shows sample data. Screens copy
 * the shape, not the data.
 *
 * The shape, in order (P13): `PageBody`, `PageHeader` (one primary action), `HeroFigure`, a
 * `KpiStrip` of 3 cards (none repeats the headline, captions carry no figures), the "Your details"
 * card, the `ScenarioZone` (one tool visible, one outcome, one chart, the page's single
 * `ProjectionNotice` in its footer), then quiet drawers.
 *
 * The templates share one directory (not one per template) because they share the sample data and
 * the chart helper; this is an intentional exception to one-component-per-directory.
 */

interface SampleAccount {
  id: string;
  name: string;
  kind: "Current" | "Savings" | "Investment" | "Pension" | "Card";
  /** Pounds. Negative for money owed. */
  balance: number;
}

const ACCOUNTS: readonly SampleAccount[] = [
  { id: "current", name: "Everyday current account", kind: "Current", balance: 3240.18 },
  { id: "saver", name: "Easy-access saver", kind: "Savings", balance: 14300 },
  { id: "isa", name: "Stocks and shares ISA", kind: "Investment", balance: 22150 },
  { id: "pension", name: "Workplace pension", kind: "Pension", balance: 61800 },
  { id: "card", name: "Everyday credit card", kind: "Card", balance: -1860.75 },
];

const sumOf = (rows: readonly SampleAccount[]): number =>
  Math.round(rows.reduce((total, row) => total + row.balance, 0) * 100) / 100;

const sumKinds = (...kinds: SampleAccount["kind"][]): number =>
  sumOf(ACCOUNTS.filter((a) => kinds.includes(a.kind)));

const NET_WORTH = sumOf(ACCOUNTS);
const DEBT_OWED = Math.abs(sumOf(ACCOUNTS.filter((a) => a.balance < 0)));

/** Whole pounds, en-GB (P8). */
const pounds = (value: number): string => formatMoney(value, { fractionDigits: 0 }).text;

/** Durations over 24 months read as years and months (P8): "3 years 4 months". */
export const formatDuration = (totalMonths: number): string => {
  const months = Math.max(0, Math.round(totalMonths));
  const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;
  if (months < 24) return plural(months, "month");
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? plural(years, "year") : `${plural(years, "year")} ${plural(rest, "month")}`;
};

// ---- Chart helper -------------------------------------------------------------------------

interface ChartPoint {
  label: string;
  /** Axis label. Empty for no tick; at most 6 are drawn (P10.4). */
  short: string;
  value: number;
  projected: boolean;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Sample shape: nine months of history ending at today's figure (September). */
const SAMPLE_SHAPE = [0.78, 0.8, 0.82, 0.85, 0.88, 0.91, 0.94, 0.97, 1] as const;

/** Sample monthly history that ends exactly at `current`, so the chart agrees with the figures. */
const sampleHistory = (current: number): ChartPoint[] =>
  SAMPLE_SHAPE.map((factor, i) => ({
    label: MONTHS[i] ?? "",
    short: (MONTHS[i] ?? "").slice(0, 3),
    value: Math.round(current * factor),
    projected: false,
  }));

/** Drawing width before the chart is measured (server render, tests). */
const DEFAULT_W = 900;
const H = 240;
const PAD = { l: 64, r: 8, t: 12, b: 36 };
const MAX_TICKS = 6;

const niceCeil = (max: number): number => {
  if (max <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(max)) / 2;
  return Math.ceil(max / step) * step;
};

/**
 * The SVG's own width in CSS pixels, so one drawing unit is one pixel and the axis text stays at
 * its text-style size at every width (a fixed 900-unit viewBox shrank it to about 6px at 375).
 */
const useMeasuredWidth = (): [(el: SVGSVGElement | null) => void, number] => {
  const [el, setEl] = useState<SVGSVGElement | null>(null);
  const [width, setWidth] = useState(DEFAULT_W);
  useEffect(() => {
    if (!el || typeof ResizeObserver !== "function") return;
    const measure = () => {
      const next = Math.round(el.getBoundingClientRect().width);
      if (next > 0) setWidth(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);
  return [setEl, width];
};

/** Static stand-in for a real chart (templates never import recharts). */
const TemplateChart: FC<{ points: readonly ChartPoint[] }> = ({ points }) => {
  const [svgRef, W] = useMeasuredWidth();
  const yMax = niceCeil(Math.max(...points.map((p) => p.value)));
  const x = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / Math.max(points.length - 1, 1);
  const y = (v: number) => PAD.t + (1 - v / yMax) * (H - PAD.t - PAD.b);
  const coords = (list: readonly ChartPoint[], from = 0) =>
    list.map((p, i) => `${x(i + from).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const firstProjected = points.findIndex((p) => p.projected);
  const actual = firstProjected === -1 ? points : points.slice(0, firstProjected);
  // The dashed line starts at the last real point so the two lines join.
  const projectedStart = Math.max(firstProjected - 1, 0);
  const projected = firstProjected === -1 ? [] : points.slice(projectedStart);
  const ticked = points.map((p, i) => ({ p, i })).filter(({ p }) => p.short !== "");
  const tickEvery = Math.ceil(ticked.length / MAX_TICKS);
  return (
    <svg
      aria-hidden="true"
      className={chartSvg}
      focusable="false"
      ref={svgRef}
      role="presentation"
      viewBox={`0 0 ${W} ${H}`}
    >
      {[0, yMax / 2, yMax].map((tick) => (
        <g key={tick}>
          <line className={chartGrid} x1={PAD.l} x2={W - PAD.r} y1={y(tick)} y2={y(tick)} />
          <text className={chartAxisText} textAnchor="end" x={PAD.l - 8} y={y(tick) + 4}>
            {formatAxisCurrency(tick)}
          </text>
        </g>
      ))}
      {firstProjected === -1 ? null : (
        <rect
          className={chartBand}
          height={H - PAD.t - PAD.b}
          width={x(points.length - 1) - x(projectedStart)}
          x={x(projectedStart)}
          y={PAD.t}
        />
      )}
      {actual.length > 1 ? <polyline className={chartLine} points={coords(actual)} /> : null}
      {projected.length > 1 ? (
        <polyline className={chartProjectionLine} points={coords(projected, projectedStart)} />
      ) : null}
      {ticked.map(({ p, i }, n) =>
        n % tickEvery === 0 ? (
          <text
            className={chartAxisText}
            key={p.label}
            // The last point sits at the plot's right edge: end-anchor it so it is never clipped.
            textAnchor={i === points.length - 1 ? "end" : "middle"}
            x={x(i)}
            y={H - 10}
          >
            {p.short}
          </text>
        ) : null,
      )}
    </svg>
  );
};

interface SeriesFigureProps {
  title: string;
  /** What the plotted figure is, for the data table, e.g. "Net worth". */
  measure: string;
  points: readonly ChartPoint[];
  /** One sentence, at most 2 figures, none repeating a figure shown elsewhere on the page (P10.1). */
  summary: string;
  headingLevel?: "h2" | "h3";
  /** Hide the title visually where a nearby heading already names the chart. */
  hideTitle?: boolean;
}

/**
 * A titled, summarised chart. One series is labelled by the title, so there is no legend (P10.2);
 * the data table sits behind the quiet "Show data" button (P10.5); the page owns the one notice.
 */
const SeriesFigure: FC<SeriesFigureProps> = ({
  title,
  measure,
  points,
  summary,
  headingLevel = "h2",
  hideTitle = false,
}) => (
  <ChartFigure
    dataTable={
      <Table caption={`${measure} by month`}>
        <THead>
          <tr>
            <Th>Month</Th>
            <Th numeric>{measure}</Th>
          </tr>
        </THead>
        <TBody>
          {points.map((p) => (
            <tr key={p.label}>
              <Td>{p.projected ? `${p.label} (projected)` : p.label}</Td>
              <Td numeric>
                <Money size="sm" value={p.value} />
              </Td>
            </tr>
          ))}
        </TBody>
      </Table>
    }
    headingLevel={headingLevel}
    hideTitle={hideTitle}
    pointCount={points.length}
    showSummary
    summary={summary}
    title={title}
  >
    <TemplateChart points={points} />
  </ChartFigure>
);

// ---- Templates ----------------------------------------------------------------------------

/** The page frame a template renders in: the canvas and `main` landmark the app shell supplies. */
const TemplatePage: FC<{ children: ReactNode }> = ({ children }) => (
  <main className={page}>
    <PageBody>{children}</PageBody>
  </main>
);

/**
 * Home (P13, P1.8): header with one primary action, the net worth hero with one delta, three
 * supporting KPIs, the accounts list (one figure per row) and a history chart. No projection is
 * drawn, so the page carries no projection notice. At most 10 figures.
 */
export const DashboardTemplate: FC = () => {
  const history = sampleHistory(NET_WORTH);
  const lastMonth = history[history.length - 2]?.value ?? NET_WORTH;
  const change = Math.round(NET_WORTH) - lastMonth;
  return (
    <TemplatePage>
      <PageHeader
        actions={<Button>Add account</Button>}
        badge="Sample data"
        description="Everything you own and owe, in one place."
        title="Home"
      />
      <HeroFigure
        delta={{
          direction: change >= 0 ? "up" : "down",
          text: `${pounds(Math.abs(change))} since last month`,
          polarity: "asset",
        }}
        label="Net worth"
        value={NET_WORTH}
      />
      <KpiStrip
        items={[
          <KpiCard
            key="sav"
            label="Savings and investments"
            subtext="Easy-access saver and ISA"
            value={sumKinds("Savings", "Investment")}
            valueFormat={{ fractionDigits: 0 }}
          />,
          <KpiCard
            key="pen"
            label="Pension"
            subtext="Workplace pension"
            value={sumKinds("Pension")}
            valueFormat={{ fractionDigits: 0 }}
          />,
          <KpiCard
            key="debt"
            label="What you owe"
            subtext="Everyday credit card"
            value={DEBT_OWED}
            valueFormat={{ fractionDigits: 0 }}
          />,
        ]}
      />
      <Card aria-labelledby="your-accounts" as="section" padding="lg">
        <div className={cardHeader}>
          <h2 className={cardTitle} id="your-accounts">
            Your accounts
          </h2>
        </div>
        <Table caption="Your accounts">
          <THead>
            <tr>
              <Th>Account</Th>
              <Th numeric>Balance</Th>
            </tr>
          </THead>
          <TBody>
            {/* Two columns so nothing scrolls at 375 (P1.4: one figure per row); the account
                type is secondary text under the name. */}
            {ACCOUNTS.map((a) => (
              <tr data-list-row="" key={a.id}>
                <Td>
                  <span className={listItemMeta}>
                    <span>{a.name}</span>
                    <span className={mutedText}>{a.kind}</span>
                  </span>
                </Td>
                <Td numeric>
                  <Money size="sm" value={a.balance} />
                </Td>
              </tr>
            ))}
          </TBody>
        </Table>
      </Card>
      <Card aria-label="Net worth over time" as="section" elevation="resting" padding="lg">
        <SeriesFigure
          measure="Net worth"
          points={history}
          summary={`Your net worth has grown every month since January, when it was ${pounds(history[0]?.value ?? 0)}.`}
          title="Your net worth this year"
        />
      </Card>
    </TemplatePage>
  );
};

const STRATEGIES = [
  { value: "avalanche", label: "Highest rate first", description: "Saves the most interest" },
  { value: "snowball", label: "Smallest balance first", description: "Clears a debt sooner" },
] as const;

const STRATEGY_LABEL: Record<string, string> = {
  avalanche: "highest rate first",
  snowball: "smallest balance first",
};

const sampleDebts = (cardApr: number): DebtItem[] => [
  {
    id: "card",
    name: "Everyday credit card",
    balanceGbp: 1860.75,
    interestRateApr: cardApr,
    minimumPaymentGbp: 45,
    debtType: "credit_card",
  },
  {
    id: "car",
    name: "Car finance",
    balanceGbp: 4340,
    interestRateApr: 7.9,
    minimumPaymentGbp: 210,
    debtType: "loan",
  },
  {
    id: "store",
    name: "Store card",
    balanceGbp: 520,
    interestRateApr: 19.9,
    minimumPaymentGbp: 25,
    debtType: "credit_card",
  },
];

/** The saved plan the scenario starts from. Scenario inputs never write back to it. */
const SAVED = { extra: 50, cardApr: 22.9, strategy: "avalanche" } as const;

/** Sample start month for the chart's axis: December 2026. */
const START_YEAR = 2026;
const START_MONTH = 11;

const monthAt = (offset: number): { label: string; year: number; month: number } => {
  const index = START_MONTH + offset;
  const month = index % 12;
  const year = START_YEAR + Math.floor(index / 12);
  return { label: `${(MONTHS[month] ?? "").slice(0, 3)} ${year}`, year, month };
};

const debtPoints = (result: PayoffResult, start: number): ChartPoint[] =>
  [{ month: 0, totalBalance: start }, ...result.monthlySchedule].map((m) => {
    const at = monthAt(m.month);
    return {
      label: at.label,
      // Years, not "Month 12" (P10.4): a tick at each January.
      short: at.month === 0 ? String(at.year) : "",
      value: Math.round(m.totalBalance),
      projected: true,
    };
  });

const runPlan = (debts: DebtItem[], extra: number, strategy: string): PayoffResult =>
  strategy === "snowball" ? calculateSnowball(debts, extra) : calculateAvalanche(debts, extra);

/**
 * Simulator (P13, P1.7): saved facts first (hero, KPIs, "Your details"), then a visibly lighter
 * `ScenarioZone` holding a `SimulatorSplitLayout` (AGENTS.md section 3): the tool switcher (two
 * tools, one visible, at most 3 inputs) in the sticky left column, and one outcome figure plus 2
 * supporting and one chart on the right. The page's single projection notice sits in the zone
 * footer. At most 12 figures.
 */
export const SimulatorTemplate: FC = () => {
  const [tool, setTool] = useState("extra");
  const [extra, setExtra] = useState<number>(SAVED.extra);
  const [cardApr, setCardApr] = useState<number>(SAVED.cardApr);
  const [strategy, setStrategy] = useState<string>(SAVED.strategy);

  const savedDebts = useMemo(() => sampleDebts(SAVED.cardApr), []);
  const savedPlan = useMemo(() => runPlan(savedDebts, SAVED.extra, SAVED.strategy), [savedDebts]);
  const debts = useMemo(() => sampleDebts(cardApr), [cardApr]);
  // The real payoff calculation, so every input changes the result.
  const plan = useMemo(() => runPlan(debts, extra, strategy), [debts, extra, strategy]);

  const total = savedDebts.reduce((t, d) => t + (d.balanceGbp ?? 0), 0);
  const minimums = savedDebts.reduce((t, d) => t + (d.minimumPaymentGbp ?? 0), 0);
  const highest = savedDebts.reduce((top, d) =>
    (d.interestRateApr ?? 0) > (top.interestRateApr ?? 0) ? d : top,
  );
  const achievable = plan.payoffAchievable !== false;
  const points = useMemo(() => debtPoints(plan, total), [plan, total]);
  const isModified =
    extra !== SAVED.extra || cardApr !== SAVED.cardApr || strategy !== SAVED.strategy;
  const interestSaved = Math.round(savedPlan.totalInterest - plan.totalInterest);
  const paidOff = monthAt(plan.months).label;

  const reset = () => {
    setExtra(SAVED.extra);
    setCardApr(SAVED.cardApr);
    setStrategy(SAVED.strategy);
    setTool("extra");
  };

  return (
    <TemplatePage>
      <PageHeader
        actions={<Button>Add a debt</Button>}
        badge="Sample data"
        description="See how your debts come down, and try a change."
        title="Debt payoff"
      />
      <HeroFigure label="Debt total" subline="Across your three debts" value={total} />
      <KpiStrip
        items={[
          <KpiCard
            key="pay"
            label="Paying each month"
            subtext="Minimums plus your extra payment"
            value={minimums + SAVED.extra}
            valueFormat={{ fractionDigits: 0 }}
          />,
          <KpiCard
            key="int"
            label="Interest to pay"
            subtext="If your payments stay the same"
            value={Math.round(savedPlan.totalInterest)}
            valueFormat={{ fractionDigits: 0 }}
          />,
          <KpiCard
            key="rate"
            label="Highest rate"
            subtext={highest.name}
            value={<span className={figureText}>{`${highest.interestRateApr}% APR`}</span>}
          />,
        ]}
      />
      <Card
        aria-labelledby="your-details"
        as="section"
        elevation="resting"
        id="details"
        padding="lg"
      >
        <div className={cardHeader}>
          <h2 className={cardTitle} id="your-details">
            Your details
          </h2>
        </div>
        <ul className={detailsList}>
          {savedDebts.map((d) => (
            <li className={detailsRow} data-list-row="" key={d.id}>
              <span>{d.name}</span>
              <Money size="sm" value={d.balanceGbp ?? 0} />
            </li>
          ))}
        </ul>
      </Card>
      <ScenarioZone
        announcement={
          isModified ? `debt-free in ${formatDuration(plan.months)}, last payment ${paidOff}` : ""
        }
        basis="Starting from your saved debts and payments."
        footer={
          <a className={plainLink} href="#details">
            Update your details
          </a>
        }
        isModified={isModified}
        notice={<ProjectionNotice />}
        onReset={reset}
      >
        <SimulatorSplitLayout
          content={
            <>
              <div className={outcome} data-testid="scenario-outcome" id="scenario-outcome">
                <p className={outcomeLabel}>Debt-free in</p>
                <p className={outcomeValue}>
                  {achievable ? formatDuration(plan.months) : "Not paid off at these payments"}
                </p>
                {achievable ? (
                  <dl className={outcomeSupport}>
                    <div className={outcomeSupportItem}>
                      <dt>Last payment</dt>
                      <dd className={figureText}>{paidOff}</dd>
                    </div>
                    <div className={outcomeSupportItem}>
                      <dt>
                        {interestSaved >= 0
                          ? "Less interest than your plan"
                          : "More interest than your plan"}
                      </dt>
                      <dd className={figureText}>{pounds(Math.abs(interestSaved))}</dd>
                    </div>
                  </dl>
                ) : null}
              </div>
              <SeriesFigure
                headingLevel="h3"
                hideTitle
                measure="Debt remaining"
                points={points}
                summary={
                  achievable
                    ? `Your total debt comes down every month to zero, paying ${STRATEGY_LABEL[strategy] ?? strategy}.`
                    : "At these payments your debts are not paid off."
                }
                title="How your debt comes down"
              />
            </>
          }
          contentLabel="Your result"
          controls={
            <Tabs
              aria-label="Ways to change your plan"
              items={[
                { value: "extra", label: "Pay extra" },
                { value: "rate", label: "Change a rate" },
              ]}
              onValueChange={setTool}
              panelClassName={toolStack}
              panels={{
                extra: (
                  <>
                    <SliderField
                      format="currency"
                      helperText="On top of your minimum payments."
                      label="Extra each month"
                      max={500}
                      min={0}
                      onChange={setExtra}
                      step={10}
                      value={extra}
                    />
                    <RadioCardGroup
                      legend="Which debt to pay first"
                      onValueChange={setStrategy}
                      options={STRATEGIES}
                      value={strategy}
                    />
                  </>
                ),
                rate: (
                  <SliderField
                    format="percent"
                    fractionDigits={1}
                    label="Credit card interest rate (APR)"
                    max={40}
                    min={0}
                    onChange={setCardApr}
                    step={0.1}
                    value={cardApr}
                  />
                ),
              }}
              size="sm"
              value={tool}
            />
          }
          controlsLabel="Your what-if inputs"
        />
      </ScenarioZone>
      <CollapsibleDrawer title="How this is worked out" variant="quiet">
        <p className={proseText}>
          Each month we add interest to every debt, pay the minimums, and put your extra payment
          towards one debt. When a debt is paid off, its payment moves to the next one.
        </p>
      </CollapsibleDrawer>
    </TemplatePage>
  );
};

/** Form: grouped fields in a card; the balance error appears only after Save is pressed. */
export const FormTemplate: FC = () => {
  const [balance, setBalance] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const balanceError =
    submitted && balance === null ? "Enter a balance, or leave it for later." : undefined;
  return (
    <TemplatePage>
      <PageHeader description="Tell us a little about the account." title="Add an account" />
      <Card aria-label="Account details" as="section" padding="lg">
        <form
          className={formGrid}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          <FormField label="Account name" required>
            {(field) => <TextInput {...controlProps(field)} placeholder="Easy-access saver" />}
          </FormField>
          <FormField label="Account type" required>
            {(field) => (
              <Select
                {...controlProps(field)}
                options={[
                  { value: "current", label: "Current account" },
                  { value: "savings", label: "Savings" },
                  { value: "isa", label: "ISA" },
                  { value: "pension", label: "Pension" },
                ]}
                placeholder="Choose a type"
              />
            )}
          </FormField>
          <FormField error={balanceError} hint="Today's balance in pounds." label="Current balance">
            {(field) => (
              <CurrencyInput {...controlProps(field)} onValueChange={setBalance} value={balance} />
            )}
          </FormField>
          <div className={formFull}>
            <RadioCardGroup
              defaultValue="monthly"
              legend="How often do you pay in?"
              options={[
                { value: "monthly", label: "Monthly", description: "A regular amount each month" },
                { value: "irregular", label: "When I can", description: "No set schedule" },
              ]}
            />
          </div>
          <div className={formFull}>
            <Checkbox
              defaultChecked
              hint="You can change this later."
              label="Include in my net worth"
            />
          </div>
          <div className={formFull}>
            <Switch hint="Reminders arrive by email." label="Monthly balance reminder" />
          </div>
          <div className={cx(formFull, buttonRow)}>
            <Button type="submit">Save account</Button>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </TemplatePage>
  );
};

/** List and detail: choose an account on the left, see its figures and chart on the right. */
export const ListDetailTemplate: FC = () => {
  const [selectedId, setSelectedId] = useState(ACCOUNTS[1]?.id ?? "");
  const selected = ACCOUNTS.find((a) => a.id === selectedId) ?? ACCOUNTS[0];
  return (
    <TemplatePage>
      <PageHeader actions={<Button>Add account</Button>} badge="Sample data" title="Accounts" />
      <div className={split}>
        <section aria-label="Account list" className={splitList}>
          <ul className={listReset}>
            {ACCOUNTS.map((a) => (
              <li data-list-row="" key={a.id}>
                <button
                  aria-current={a.id === selectedId ? "true" : undefined}
                  className={listItemButton}
                  onClick={() => setSelectedId(a.id)}
                  type="button"
                >
                  <span className={listItemMeta}>
                    <span>{a.name}</span>
                    <span className={mutedText}>{a.kind}</span>
                  </span>
                  <Money size="sm" value={a.balance} />
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section aria-label="Account detail" className={cx(splitDetail, stack)}>
          {selected ? (
            <>
              <h2 className={cardTitle}>{selected.name}</h2>
              <Card padding="lg">
                <SeriesFigure
                  headingLevel="h3"
                  key={selected.id}
                  measure={selected.balance < 0 ? "Amount owed" : "Balance"}
                  points={sampleHistory(Math.abs(selected.balance))}
                  summary={`${selected.balance < 0 ? "The amount owed" : "The balance"} has changed every month since January.`}
                  title={`${selected.name} this year`}
                />
              </Card>
            </>
          ) : null}
        </section>
      </div>
    </TemplatePage>
  );
};

/** Empty (P12.2): the page header and one empty state, with one illustration and one button. */
export const EmptyTemplate: FC = () => (
  <TemplatePage>
    <PageHeader title="Accounts" />
    <div className={centred}>
      <EmptyState
        action={<Button>Add an account</Button>}
        description="Add a current account, savings or pension and your totals will appear here. It only takes a minute."
        headingLevel="h2"
        illustration={<Illustration scene="empty-accounts" />}
        title="No accounts yet"
      />
    </div>
  </TemplatePage>
);

/** Error (P12.3): a recoverable problem, plain wording, one way back. */
export const ErrorTemplate: FC = () => (
  <TemplatePage>
    <div className={centred}>
      <EmptyState
        action={<Button>Back to home</Button>}
        description="That page does not exist, or it has moved. Your figures are safe."
        headingLevel="h1"
        illustration={<Illustration scene="not-found" />}
        title="We could not find that page"
      />
    </div>
  </TemplatePage>
);

/* -------------------------------------------------------------------------------------------- */
/* Page building blocks (E16 P12, P13). These are exported for app pages, unlike the templates.  */
/* -------------------------------------------------------------------------------------------- */

export interface PageBodyProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * The one page wrapper (plan P13): content at most 1200px wide (`sizes.page.max`), gutters of 16px
 * at 375, 24px from `md` and 40px from `lg`, 20px (32px from `lg`) above the h1, and 32px between
 * sections. Children render in the P13 order: `PageHeader`, `HeroFigure`, `KpiStrip`, "Your
 * details", `ScenarioZone`, drawers. It is a plain `div` because `AppShell` already supplies the
 * `main` landmark.
 *
 * Gutters and top space are applied exactly once. A shell that already pads its content marks
 * that element with `data-page-shell`, and `PageBody` adds only what the shell leaves short of
 * the P13 values:
 * - `data-page-shell=""` (AppShell's `main`): the shell pads with the same 16/24/40px gutters and
 *   20/32px top space, so `PageBody` adds none and keeps only the width cap and section gap.
 * - `data-page-shell="web"` (the apps/web root `main`, whose wrapper pads 12/24px at the sides and
 *   which pads 16/24px on top): `PageBody` adds 4px at 375 and 16px from `lg` at the sides, and
 *   4px at 375 and 8px from `lg` on top; from `md` to `lg` a -4px top margin takes the shell's
 *   24px down to P13's 20px. Pages that do not use `PageBody` are unaffected by the attribute.
 * Outside a shell (a signed-out page, a story) `PageBody` supplies everything itself. If a shell's
 * padding changes, update the matching rule in `pageBody`; when it is removed, drop the attribute
 * and `PageBody` becomes the only source of gutters.
 */
export const PageBody: FC<PageBodyProps> = ({ className, ...props }) => (
  <div className={cx(pageBody, className)} {...props} />
);

export interface PageSkeletonProps {
  /**
   * Milliseconds to wait before showing the skeleton, so a fast loader never flashes it (P12.1).
   * Defaults to 200. Pass 0 to show it at once.
   */
  delayMs?: number;
  /** Visually hidden loading message. Defaults to "Loading page". */
  label?: string;
  className?: string;
}

/**
 * The loading placeholder every route shows while its loader is pending (plan P12.1): header, hero
 * block, 3 KPI cards and 2 cards, laid out in `PageBody`. Built from `Skeleton`, so it shimmers
 * only when motion is allowed. Draws nothing until `delayMs` has passed. A visually hidden
 * `role="status"` region is mounted from the start and gets `label` when the skeleton appears, so
 * screen readers announce it; `aria-busy` sits on the skeleton container only, never on the live
 * region (a busy live region is not announced).
 */
export const PageSkeleton: FC<PageSkeletonProps> = ({
  delayMs = 200,
  label = "Loading page",
  className,
}) => {
  const [visible, setVisible] = useState(delayMs <= 0);

  useEffect(() => {
    if (delayMs <= 0) {
      setVisible(true);
      return;
    }
    setVisible(false);
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return (
    <>
      {/* A persistent live region: mounted empty, so the label is announced when it appears. */}
      <VisuallyHidden data-testid="page-skeleton-status" id="page-skeleton-status" role="status">
        {visible ? label : ""}
      </VisuallyHidden>
      {visible ? (
        <PageBody
          aria-busy="true"
          className={className}
          data-testid="page-skeleton"
          id="page-skeleton"
        >
          <div className={pageSkeletonHeader}>
            <Skeleton shape="line" />
            <Skeleton />
          </div>
          <Skeleton className={pageSkeletonHero} shape="block" size="md" />
          <div className={pageSkeletonKpis}>
            {[1, 2, 3].map((n) => (
              <div
                aria-hidden="true"
                className={pageSkeletonCard}
                data-testid="page-skeleton-kpi"
                // Numbered, because an id must be unique on the page.
                id={`page-skeleton-kpi-${n}`}
                key={n}
              >
                <Skeleton />
                <Skeleton shape="line" />
              </div>
            ))}
          </div>
          {[1, 2].map((n) => (
            <div
              aria-hidden="true"
              className={pageSkeletonCard}
              data-testid="page-skeleton-card"
              id={`page-skeleton-card-${n}`}
              key={n}
            >
              <Skeleton shape="line" />
              <Skeleton lines={3} />
            </div>
          ))}
        </PageBody>
      ) : null}
    </>
  );
};
