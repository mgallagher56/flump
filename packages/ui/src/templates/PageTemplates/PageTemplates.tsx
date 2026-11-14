import {
  calculateAvalanche,
  calculateSnowball,
  type DebtItem,
  type PayoffResult,
} from "@flump/finance-engine";
import { type FC, useMemo, useState } from "react";
import { cx } from "../../../styled-system/css";
import { formatAxisCurrency } from "../../charts/formatAxisCurrency";
import { ChartFigure } from "../../patterns/ChartFigure/ChartFigure";
import { ChartLegend, type ChartLegendItem } from "../../patterns/ChartLegend/ChartLegend";
import { EmptyState } from "../../patterns/EmptyState/EmptyState";
import { KpiStrip } from "../../patterns/KpiStrip/KpiStrip";
import { PageHeader } from "../../patterns/PageHeader/PageHeader";
import {
  PROJECTION_NOTICE_TEXT,
  ProjectionNotice,
} from "../../patterns/ProjectionNotice/ProjectionNotice";
import { SimulatorSplitLayout } from "../../patterns/SimulatorSplitLayout/SimulatorSplitLayout";
import { Button } from "../../primitives/Button/Button";
import { Card } from "../../primitives/Card/Card";
import { Checkbox } from "../../primitives/Checkbox/Checkbox";
import { CurrencyInput } from "../../primitives/CurrencyInput/CurrencyInput";
import { controlProps, FormField } from "../../primitives/FormField/FormField";
import { Illustration } from "../../primitives/Illustration/Illustration";
import { KpiCard } from "../../primitives/KpiCard/KpiCard";
import { formatMoney, Money } from "../../primitives/Money/Money";
import { RadioCardGroup } from "../../primitives/RadioCardGroup/RadioCardGroup";
import { Select } from "../../primitives/Select/Select";
import { SliderField } from "../../primitives/SliderField/SliderField";
import { Switch } from "../../primitives/Switch/Switch";
import { Table, TBody, Td, THead, Th } from "../../primitives/Table/Table";
import { TextInput } from "../../primitives/TextInput/TextInput";
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
  figureText,
  formFull,
  formGrid,
  listItemButton,
  listItemMeta,
  listReset,
  mutedText,
  page,
  split,
  splitDetail,
  splitList,
  stack,
} from "./PageTemplates.styles";

/**
 * Page templates: compositions of the Phase 2 kit that anchor visual regression and show how a
 * screen is put together. They hold no business logic of their own. Every figure is derived from
 * the sample rows below (or from `@flump/finance-engine` for the simulator), never typed in twice,
 * and every chart is labelled as sample data. Screens copy the shape, not the data.
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

const sumKind = (kind: SampleAccount["kind"]): number =>
  sumOf(ACCOUNTS.filter((a) => a.kind === kind));

const NET_WORTH = sumOf(ACCOUNTS);
const DEBT_OWED = Math.abs(sumOf(ACCOUNTS.filter((a) => a.balance < 0)));

const pounds = (value: number): string => formatMoney(value).text;

const SAMPLE_NOTICE = (
  <ProjectionNotice>{`Sample data. ${PROJECTION_NOTICE_TEXT}`}</ProjectionNotice>
);

// ---- Chart helper -------------------------------------------------------------------------

interface ChartPoint {
  label: string;
  /** Short axis label. */
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

/** Sample shape: nine months of history ending at today's figure, then three projected months. */
const SAMPLE_SHAPE = [0.78, 0.8, 0.82, 0.85, 0.88, 0.91, 0.94, 0.97, 1, 1.03, 1.06, 1.09] as const;
const CURRENT_INDEX = 8;

/** Sample monthly history that ends exactly at `current`, so the chart agrees with the figures. */
const sampleHistory = (current: number): ChartPoint[] =>
  SAMPLE_SHAPE.map((factor, i) => ({
    label: MONTHS[i] ?? "",
    short: (MONTHS[i] ?? "").slice(0, 3),
    value: Math.round(current * factor),
    projected: i > CURRENT_INDEX,
  }));

const W = 900;
const H = 240;
const PAD = { l: 64, r: 8, t: 12, b: 36 };

const niceCeil = (max: number): number => {
  if (max <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(max)) / 2;
  return Math.ceil(max / step) * step;
};

/** Static stand-in for a real chart (templates never import recharts). */
const TemplateChart: FC<{ points: readonly ChartPoint[] }> = ({ points }) => {
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
  const labelEvery = Math.ceil(points.length / 6);
  return (
    <svg
      aria-hidden="true"
      className={chartSvg}
      focusable="false"
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
      {points.map((p, i) =>
        i % labelEvery === 0 ? (
          <text className={chartAxisText} key={p.label} textAnchor="middle" x={x(i)} y={H - 10}>
            {p.short}
          </text>
        ) : null,
      )}
    </svg>
  );
};

interface SeriesFigureProps {
  title: string;
  /** What the plotted figure is, for the legend and summary, e.g. "Net worth". */
  measure: string;
  points: readonly ChartPoint[];
  /** Sentence after the derived figures, e.g. a note on how the series was built. */
  note: string;
  headingLevel?: "h2" | "h3";
}

/** A titled, summarised chart whose summary and data table come from the same points. */
const SeriesFigure: FC<SeriesFigureProps> = ({
  title,
  measure,
  points,
  note,
  headingLevel = "h2",
}) => {
  const first = points[0];
  const last = points[points.length - 1];
  const hasActual = points.some((p) => !p.projected);
  const legend: ChartLegendItem[] = [
    ...(hasActual
      ? [{ id: "actual", label: measure, color: "primary", swatch: "line" } as const]
      : []),
    ...(points.some((p) => p.projected)
      ? [
          {
            id: "projection",
            label: hasActual ? "Projection" : `${measure} (projection)`,
            color: "projection",
            swatch: "dashed",
          } as const,
        ]
      : []),
  ];
  return (
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
      legend={<ChartLegend items={legend} />}
      notice={SAMPLE_NOTICE}
      showSummary
      summary={`${measure} goes from ${pounds(first?.value ?? 0)} at the start (${first?.label ?? ""}) to ${pounds(last?.value ?? 0)} at the end (${last?.label ?? ""}). ${note}`}
      title={title}
    >
      <TemplateChart points={points} />
    </ChartFigure>
  );
};

// ---- Shared pieces ------------------------------------------------------------------------

const AccountsTable: FC = () => (
  <Table caption="Your accounts">
    <THead>
      <tr>
        <Th>Account</Th>
        <Th>Type</Th>
        <Th numeric>Balance</Th>
      </tr>
    </THead>
    <TBody>
      {ACCOUNTS.map((a) => (
        <tr key={a.id}>
          <Td>{a.name}</Td>
          <Td>{a.kind}</Td>
          <Td numeric>
            <Money fractionDigits={2} size="sm" value={a.balance} />
          </Td>
        </tr>
      ))}
    </TBody>
  </Table>
);

// ---- Templates ----------------------------------------------------------------------------

/** Home: header, one hero KPI plus up to three more in a single row, chart, accounts table. */
export const DashboardTemplate: FC = () => (
  <main className={page}>
    <PageHeader
      actions={<Button>Add account</Button>}
      description="Sample figures, so you can see how the page fits together."
      title="Home"
    />
    <KpiStrip
      items={[
        <KpiCard
          key="nw"
          label="Net worth"
          tone="hero"
          value={NET_WORTH}
          valueFormat={{ fractionDigits: 2 }}
        />,
        <KpiCard
          key="sav"
          label="Savings"
          value={sumKind("Savings")}
          valueFormat={{ fractionDigits: 2 }}
        />,
        <KpiCard key="debt" label="Debt" value={DEBT_OWED} valueFormat={{ fractionDigits: 2 }} />,
        <KpiCard
          key="pen"
          label="Pension"
          value={sumKind("Pension")}
          valueFormat={{ fractionDigits: 2 }}
        />,
      ]}
    />
    <Card aria-label="Net worth chart" as="section" elevation="resting" padding="lg">
      <SeriesFigure
        measure="Net worth"
        note="The last three months are a projection."
        points={sampleHistory(NET_WORTH)}
        title="Your net worth over the past year (sample data)"
      />
    </Card>
    <Card aria-label="Accounts" as="section" padding="lg">
      <div className={cardHeader}>
        <h2 className={cardTitle}>Accounts</h2>
      </div>
      <AccountsTable />
    </Card>
  </main>
);

const STRATEGIES = [
  { value: "avalanche", label: "Avalanche", description: "Pay the highest interest rate first" },
  { value: "snowball", label: "Snowball", description: "Pay the smallest balance first" },
] as const;

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
    interestRateApr: 29.9,
    minimumPaymentGbp: 25,
    debtType: "credit_card",
  },
];

const debtPoints = (result: PayoffResult, start: number): ChartPoint[] => [
  { label: "Now", short: "Now", value: Math.round(start), projected: true },
  ...result.monthlySchedule.map((m) => ({
    label: `Month ${m.month}`,
    short: `M${m.month}`,
    value: Math.round(m.totalBalance),
    projected: true,
  })),
];

/** Simulator: sticky parameter column on the left, outcome and chart on the right. */
export const SimulatorTemplate: FC = () => {
  const [extra, setExtra] = useState(150);
  const [cardApr, setCardApr] = useState(22.9);
  const [strategy, setStrategy] = useState("avalanche");
  const debts = useMemo(() => sampleDebts(cardApr), [cardApr]);
  const startBalance = debts.reduce((t, d) => t + (d.balanceGbp ?? 0), 0);
  const minimums = debts.reduce((t, d) => t + (d.minimumPaymentGbp ?? 0), 0);
  // The real payoff engine, so the strategy control changes the result.
  const result = useMemo(
    () =>
      strategy === "snowball" ? calculateSnowball(debts, extra) : calculateAvalanche(debts, extra),
    [debts, extra, strategy],
  );
  const achievable = result.payoffAchievable !== false;
  const points = useMemo(() => debtPoints(result, startBalance), [result, startBalance]);
  return (
    <main className={page}>
      <PageHeader
        description="Sample debts. Figures are calculated by Flump."
        title="Debt payoff"
      />
      <SimulatorSplitLayout
        content={
          <div className={stack}>
            <KpiStrip
              items={[
                <KpiCard
                  key="free"
                  label="Debt-free in"
                  tone="hero"
                  value={
                    achievable ? (
                      <span className={figureText}>{result.months} months</span>
                    ) : undefined
                  }
                />,
                <KpiCard
                  key="int"
                  label="Interest paid"
                  value={achievable ? Math.round(result.totalInterest) : undefined}
                />,
                <KpiCard key="pay" label="Monthly payment" value={minimums + extra} />,
              ]}
            />
            <Card aria-label="Balance over time" as="section" padding="lg">
              <SeriesFigure
                measure="Debt remaining"
                note={`Calculated with the ${strategy} strategy and ${pounds(extra)} extra a month, on sample debts.`}
                points={points}
                title="How your debt falls (sample debts)"
              />
            </Card>
          </div>
        }
        controls={
          <div className={stack}>
            <SliderField
              format="currency"
              helperText={`On top of ${pounds(minimums)} in minimum payments.`}
              label="Extra each month"
              max={500}
              min={0}
              onChange={setExtra}
              step={10}
              value={extra}
            />
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
            <RadioCardGroup
              legend="Payoff strategy"
              onValueChange={setStrategy}
              options={STRATEGIES}
              value={strategy}
            />
          </div>
        }
        summary={<span>{achievable ? `Debt-free in ${result.months} months` : "Not set"}</span>}
      />
    </main>
  );
};

/** Form: grouped fields in a card; the balance error appears only after Save is pressed. */
export const FormTemplate: FC = () => {
  const [balance, setBalance] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const balanceError =
    submitted && balance === null ? "Enter a balance, or leave it for later." : undefined;
  return (
    <main className={page}>
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
    </main>
  );
};

/** List and detail: choose an account on the left, see its figures and chart on the right. */
export const ListDetailTemplate: FC = () => {
  const [selectedId, setSelectedId] = useState(ACCOUNTS[1]?.id ?? "");
  const selected = ACCOUNTS.find((a) => a.id === selectedId) ?? ACCOUNTS[0];
  return (
    <main className={page}>
      <PageHeader actions={<Button>Add account</Button>} title="Accounts" />
      <div className={split}>
        <section aria-label="Account list" className={splitList}>
          <ul className={listReset}>
            {ACCOUNTS.map((a) => (
              <li key={a.id}>
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
                  <Money fractionDigits={2} size="sm" value={a.balance} />
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section aria-label="Account detail" className={cx(splitDetail, stack)}>
          {selected ? (
            <>
              <h2 className={cardTitle}>{selected.name}</h2>
              <KpiStrip
                items={[
                  <KpiCard
                    key="bal"
                    label={selected.balance < 0 ? "Owed" : "Balance"}
                    value={Math.abs(selected.balance)}
                    valueFormat={{ fractionDigits: 2 }}
                  />,
                  <KpiCard
                    key="kind"
                    label="Account type"
                    value={<span className={figureText}>{selected.kind}</span>}
                  />,
                ]}
              />
              <Card padding="lg">
                <SeriesFigure
                  headingLevel="h3"
                  key={selected.id}
                  measure={selected.balance < 0 ? "Amount owed" : "Balance"}
                  note="The last three months are a projection."
                  points={sampleHistory(Math.abs(selected.balance))}
                  title={`${selected.name} (sample data)`}
                />
              </Card>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
};

/** Empty: first-run state with one illustration and one clear next step. */
export const EmptyTemplate: FC = () => (
  <main className={page}>
    <PageHeader title="Accounts" />
    <div className={centred}>
      <EmptyState
        action={<Button>Add an account</Button>}
        description="Add a current account, savings or pension and your totals will appear here."
        headingLevel="h2"
        illustration={<Illustration scene="empty-accounts" />}
        secondaryAction={<Button variant="secondary">Connect a bank</Button>}
        title="No accounts yet"
      />
    </div>
  </main>
);

/** Error: a recoverable problem, plain wording, a way back. */
export const ErrorTemplate: FC = () => (
  <main className={page}>
    <div className={centred}>
      <EmptyState
        action={<Button>Back to home</Button>}
        description="That page does not exist, or it has moved. Your figures are safe."
        headingLevel="h2"
        illustration={<Illustration scene="not-found" />}
        title="We could not find that page"
      />
    </div>
  </main>
);
