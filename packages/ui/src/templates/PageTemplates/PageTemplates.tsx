import { type FC, useState } from "react";
import { cx } from "../../../styled-system/css";
import { ChartFigure } from "../../patterns/ChartFigure/ChartFigure";
import { ChartLegend } from "../../patterns/ChartLegend/ChartLegend";
import { EmptyState } from "../../patterns/EmptyState/EmptyState";
import { KpiStrip } from "../../patterns/KpiStrip/KpiStrip";
import { PageHeader } from "../../patterns/PageHeader/PageHeader";
import { ProjectionNotice } from "../../patterns/ProjectionNotice/ProjectionNotice";
import { SimulatorSplitLayout } from "../../patterns/SimulatorSplitLayout/SimulatorSplitLayout";
import { Button } from "../../primitives/Button/Button";
import { Card } from "../../primitives/Card/Card";
import { Checkbox } from "../../primitives/Checkbox/Checkbox";
import { CurrencyInput } from "../../primitives/CurrencyInput/CurrencyInput";
import { controlProps, FormField } from "../../primitives/FormField/FormField";
import { Illustration } from "../../primitives/Illustration/Illustration";
import { KpiCard } from "../../primitives/KpiCard/KpiCard";
import { Money } from "../../primitives/Money/Money";
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
  chartWealthLine,
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
 * screen is put together. They hold no business logic; screens copy the shape, not the data.
 */

interface SampleAccount {
  id: string;
  name: string;
  kind: string;
  balance: number;
  change: number;
}

const ACCOUNTS: readonly SampleAccount[] = [
  {
    id: "current",
    name: "Everyday current account",
    kind: "Current",
    balance: 3240.18,
    change: 120,
  },
  { id: "saver", name: "Easy-access saver", kind: "Savings", balance: 14300, change: 250 },
  { id: "isa", name: "Stocks and shares ISA", kind: "Investment", balance: 22150, change: 410 },
  { id: "pension", name: "Workplace pension", kind: "Pension", balance: 61800, change: 690.25 },
  { id: "card", name: "Everyday credit card", kind: "Card", balance: -1860.75, change: 95 },
];

const MONTHS = ["Jan", "Mar", "May", "Jul", "Sep", "Nov"];
const TICKS = [
  { y: 20, label: "£50k" },
  { y: 70, label: "£25k" },
  { y: 120, label: "£0" },
];

const LEGEND = [
  { id: "networth", label: "Net worth", color: "primary", swatch: "line" },
  { id: "projection", label: "Projection", color: "projection", swatch: "dashed" },
] as const;

/** Static stand-in for a real chart (templates never import recharts). */
const TemplateChart: FC = () => (
  <svg
    aria-hidden="true"
    className={chartSvg}
    focusable="false"
    role="presentation"
    viewBox="0 0 600 160"
  >
    {TICKS.map((t) => (
      <g key={t.y}>
        <line className={chartGrid} x1="48" x2="592" y1={t.y} y2={t.y} />
        <text className={chartAxisText} textAnchor="end" x="40" y={t.y + 4}>
          {t.label}
        </text>
      </g>
    ))}
    <rect className={chartBand} height="100" width="170" x="422" y="20" />
    <polyline className={chartLine} points="48,104 120,98 200,92 280,78 360,64 422,52" />
    <polyline className={chartProjectionLine} points="422,52 480,44 540,36 592,30" />
    <polyline className={chartWealthLine} points="48,116 200,110 360,100 422,96" />
    {MONTHS.map((m, i) => (
      <text className={chartAxisText} key={m} textAnchor="middle" x={60 + i * 100} y="150">
        {m}
      </text>
    ))}
  </svg>
);

const NetWorthFigure: FC<{ sample?: boolean; headingLevel?: "h2" | "h3"; title?: string }> = ({
  sample = false,
  title = "Your net worth over the past year",
  headingLevel = "h2",
}) => (
  <ChartFigure
    headingLevel={headingLevel}
    dataTable={
      <Table caption="Net worth by month">
        <THead>
          <tr>
            <Th>Month</Th>
            <Th numeric>Net worth</Th>
          </tr>
        </THead>
        <TBody>
          <tr>
            <Td>Jan 2026</Td>
            <Td numeric>£21,400</Td>
          </tr>
          <tr>
            <Td>Nov 2026</Td>
            <Td numeric>£48,250</Td>
          </tr>
        </TBody>
      </Table>
    }
    legend={<ChartLegend items={LEGEND} />}
    notice={sample ? <ProjectionNotice /> : undefined}
    showSummary
    summary="Net worth rises from £21,400 in January to £48,250 in November. The last three months are a projection."
    title={title}
  >
    <TemplateChart />
  </ChartFigure>
);

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

/** Home: header, one hero KPI plus up to three more in a single row, chart, accounts table. */
export const DashboardTemplate: FC = () => (
  <main className={page}>
    <PageHeader
      actions={<Button>Add account</Button>}
      description="Here is where your money stands today."
      title="Home"
    />
    <KpiStrip
      items={[
        <KpiCard key="nw" label="Net worth" tone="hero" value={48250} />,
        <KpiCard
          deltaText="+£250 this month"
          deltaVariant="positive"
          key="sav"
          label="Savings"
          value={14300}
        />,
        <KpiCard key="debt" label="Debt" value={1860.75} valueFormat={{ fractionDigits: 2 }} />,
        <KpiCard key="pen" label="Pension" notSetLabel="Not set" value={undefined} />,
      ]}
    />
    <Card as="section" aria-label="Net worth chart" elevation="resting" padding="lg">
      <NetWorthFigure sample />
    </Card>
    <Card as="section" aria-label="Accounts" padding="lg">
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

/** Simulator: sticky parameter column on the left, outcome and chart on the right. */
export const SimulatorTemplate: FC = () => {
  const [extra, setExtra] = useState(150);
  const [rate, setRate] = useState(19.9);
  const [balance, setBalance] = useState(8400);
  const [strategy, setStrategy] = useState("avalanche");
  const months = Math.max(6, Math.round(balance / (210 + extra)));
  return (
    <main className={page}>
      <PageHeader
        description="See how extra payments change your debt-free date."
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
                  value={<span className={figureText}>{months} mo</span>}
                />,
                <KpiCard
                  key="int"
                  label="Interest paid"
                  value={Math.round(balance * (rate / 100) * (months / 24))}
                />,
                <KpiCard key="pay" label="Monthly payment" value={210 + extra} />,
              ]}
            />
            <Card as="section" aria-label="Balance over time" padding="lg">
              <NetWorthFigure sample title="Your debt over time" />
            </Card>
          </div>
        }
        controls={
          <div className={stack}>
            <SliderField
              format="currency"
              label="Total debt"
              max={30000}
              min={500}
              onChange={setBalance}
              step={100}
              value={balance}
            />
            <SliderField
              format="percent"
              fractionDigits={1}
              label="Interest rate (APR)"
              max={40}
              min={0}
              onChange={setRate}
              step={0.1}
              value={rate}
            />
            <SliderField
              format="currency"
              helperText="On top of your minimum payments."
              label="Extra each month"
              max={1000}
              min={0}
              onChange={setExtra}
              step={10}
              value={extra}
            />
            <RadioCardGroup
              legend="Payoff strategy"
              onValueChange={setStrategy}
              options={STRATEGIES}
              value={strategy}
            />
          </div>
        }
        summary={<Money size="md" value={balance} />}
      />
    </main>
  );
};

/** Form: grouped fields in a card, one field showing its error state, actions at the end. */
export const FormTemplate: FC = () => {
  const [balance, setBalance] = useState<number | null>(null);
  return (
    <main className={page}>
      <PageHeader description="Tell us a little about the account." title="Add an account" />
      <Card as="section" aria-label="Account details" padding="lg">
        <form className={formGrid} onSubmit={(e) => e.preventDefault()}>
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
          <FormField
            error={balance === null ? "Enter a balance, or leave it for later." : undefined}
            hint="Today's balance in pounds."
            label="Current balance"
          >
            {(field) => (
              <CurrencyInput {...controlProps(field)} onValueChange={setBalance} value={balance} />
            )}
          </FormField>
          <div className={formFull}>
            <RadioCardGroup
              legend="How often do you pay in?"
              options={[
                { value: "monthly", label: "Monthly", description: "A regular amount each month" },
                { value: "irregular", label: "When I can", description: "No set schedule" },
              ]}
              defaultValue="monthly"
            />
          </div>
          <div className={formFull}>
            <Checkbox
              hint="You can change this later."
              label="Include in my net worth"
              defaultChecked
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

/** List and detail: choose an account on the left, see its figures on the right. */
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
                    label="Balance"
                    value={selected.balance}
                    valueFormat={{ fractionDigits: 2 }}
                  />,
                  <KpiCard
                    key="chg"
                    label="Paid in this month"
                    value={selected.change}
                    valueFormat={{ fractionDigits: 2 }}
                  />,
                ]}
              />
              <Card padding="lg">
                <NetWorthFigure headingLevel="h3" />
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
        description="Add a current account, savings or pension and your totals will appear here. It only takes a minute."
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
