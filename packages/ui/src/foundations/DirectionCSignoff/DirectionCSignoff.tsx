import { ArrowUp, Check, Clock, Info, TriangleAlert } from "lucide-react";
import type { FC } from "react";
import { ChartFigure } from "../../patterns/ChartFigure/ChartFigure";
import { CoachCard } from "../../patterns/CoachCard/CoachCard";
import { EmptyState } from "../../patterns/EmptyState/EmptyState";
import { KpiStrip } from "../../patterns/KpiStrip/KpiStrip";
import { PageHeader } from "../../patterns/PageHeader/PageHeader";
import { Button } from "../../primitives/Button/Button";
import { Icon } from "../../primitives/Icon/Icon";
import { Illustration } from "../../primitives/Illustration/Illustration";
import { KpiCard } from "../../primitives/KpiCard/KpiCard";
import { formatMoney, Money } from "../../primitives/Money/Money";
import { StatusBadge } from "../../primitives/StatusBadge/StatusBadge";
import { Table, TBody, Td, THead, Th } from "../../primitives/Table/Table";
import {
  badgeRow,
  chartAssets,
  chartAxisText,
  chartBand,
  chartDebt,
  chartGridLine,
  chartProjection,
  chartSvg,
  chartWealth,
  chartWrap,
  emptyWrap,
  heroBlock,
  heroDelta,
  heroFigure,
  heroLabel,
  heroSample,
  heroTop,
  hideNarrow,
  legendItem,
  legendList,
  legendSwatch,
  signoffNarrow,
  signoffPanel,
  signoffPanelTitle,
  signoffRoot,
  signoffSection,
  signoffSectionNote,
  signoffSectionTitle,
  signoffTwoColumn,
  signoffWide,
  tableCellSub,
  tableCellText,
} from "./DirectionCSignoff.styles";

const SAMPLE = "Sample data";

const MONTHS = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
/** Sample figures in pounds, one per month. */
const NET_WORTH = [
  84300, 85100, 86400, 87000, 88900, 90200, 91600, 93500, 94800, 95900, 96630, 97750,
];
const SAVINGS = [
  11200, 11800, 12400, 13100, 13700, 14300, 14900, 15500, 16000, 16500, 17000, 17550,
];
const DEBT = [9800, 9500, 9200, 8900, 8500, 8200, 7900, 7600, 7200, 6900, 6600, 6200];
const PROJECTION_FROM = 9;

const W = 560;
const H = 220;
const PAD = { l: 44, r: 12, t: 12, b: 28 };
const Y_MAX = 100000;

const x = (i: number): number => PAD.l + (i * (W - PAD.l - PAD.r)) / (MONTHS.length - 1);
const y = (v: number): number => PAD.t + (1 - v / Y_MAX) * (H - PAD.t - PAD.b);
const points = (series: number[], from = 0): string =>
  series
    .map((v, i) => (i >= from ? `${x(i).toFixed(1)},${y(v).toFixed(1)}` : null))
    .filter(Boolean)
    .join(" ");

const gridTicks = [0, 25000, 50000, 75000, 100000];

const chartSummary =
  "Sample data. Net worth rises from £84,300 in December to £97,750 in November. " +
  "Savings rise from £11,200 to £17,550 and card debt falls from £9,800 to £6,200. " +
  "The last three months of net worth are a projection, drawn dashed.";

const ACCOUNTS: { name: string; kind: string; balance: number; change: number }[] = [
  { name: "Current account", kind: "Cash", balance: 3250.4, change: 120.5 },
  { name: "Easy-access saver", kind: "Savings", balance: 14300, change: 250 },
  { name: "Workplace pension", kind: "Pension", balance: 61800, change: 690.25 },
  { name: "Everyday credit card", kind: "Card", balance: -1860.75, change: 95 },
  { name: "Car finance", kind: "Loan", balance: -4340, change: 210 },
];

const SampleChart: FC = () => (
  <div className={chartWrap()}>
    <svg
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={chartSvg}
      viewBox={`0 0 ${W} ${H}`}
    >
      {gridTicks.map((t) => (
        <g key={t}>
          <line className={chartGridLine} x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
          <text className={chartAxisText} textAnchor="end" x={PAD.l - 6} y={y(t) + 4}>
            {t === 0 ? "£0" : `£${t / 1000}k`}
          </text>
        </g>
      ))}
      <rect
        className={chartBand}
        height={H - PAD.t - PAD.b}
        width={x(MONTHS.length - 1) - x(PROJECTION_FROM)}
        x={x(PROJECTION_FROM)}
        y={PAD.t}
      />
      {MONTHS.map((m, i) =>
        i % 2 === 0 ? (
          <text className={chartAxisText} key={m} textAnchor="middle" x={x(i)} y={H - 8}>
            {m}
          </text>
        ) : null,
      )}
      <polyline className={chartAssets} points={points(NET_WORTH.slice(0, PROJECTION_FROM + 1))} />
      <polyline className={chartProjection} points={points(NET_WORTH, PROJECTION_FROM)} />
      <polyline className={chartWealth} points={points(SAVINGS)} />
      <polyline className={chartDebt} points={points(DEBT)} />
    </svg>
  </div>
);

export interface DirectionCSignoffProps {
  /** Fired when the coach card primary action is pressed. */
  onFinishSetup?: () => void;
}

/**
 * Owner sign-off frame: the Dashboard of Direction C composed with the real tokens, components and
 * fonts. Everything shown is sample data. Not used by any screen.
 */
export const DirectionCSignoff: FC<DirectionCSignoffProps> = ({ onFinishSetup }) => (
  <div className={signoffRoot()} data-testid="direction-c-signoff">
    <PageHeader
      actions={<StatusBadge variant="neutral">{SAMPLE}</StatusBadge>}
      subtitle="Where you stand this month. Sample data."
      title="Home"
    />

    <section
      aria-labelledby="signoff-hero-title"
      className={heroBlock()}
      data-testid="signoff-hero"
    >
      <div className={heroTop()}>
        <h2 className={heroLabel()} id="signoff-hero-title">
          Net worth
        </h2>
        <span className={heroSample()}>{SAMPLE}</span>
      </div>
      <p className={heroFigure()} data-testid="signoff-hero-figure">
        {formatMoney(97750).text}
      </p>
      <p className={heroDelta()}>
        <Icon icon={ArrowUp} size="sm" />
        Up £1,120 since last month
      </p>
    </section>

    <section aria-labelledby="signoff-stand-title" className={signoffSection()}>
      <h2 className={signoffSectionTitle()} id="signoff-stand-title">
        Where you stand
      </h2>
      <KpiStrip>
        <KpiCard
          delta={{ direction: "up", text: "£1,120" }}
          label="Net worth"
          value={<Money size="kpi" value={97750} />}
        />
        <KpiCard
          label="Monthly surplus"
          subtext="£2,760 in, £2,150 out"
          value={<Money size="kpi" value={610} />}
        />
        <KpiCard
          label="Weekly safe to spend"
          subtext="Sample estimate"
          value={<Money size="kpi" value={140} />}
        />
        <KpiCard
          label="Liquid cash"
          subtext="About 8 months of outgoings"
          value={<Money size="kpi" value={17550} />}
        />
      </KpiStrip>
    </section>

    <CoachCard
      description="Two details are missing: your workplace pension balance and the interest rate on one card. Adding them makes the totals above more complete. No pressure, you can change this any time."
      eyebrow="Housekeeping"
      headingLevel="h2"
      primaryAction={<Button onClick={onFinishSetup}>Add missing details</Button>}
      secondaryAction={<Button variant="secondary">Not now</Button>}
      title="Finish setting up"
    />

    <section aria-labelledby="signoff-trends-title" className={signoffSection()}>
      <h2 className={signoffSectionTitle()} id="signoff-trends-title">
        Over time and by account
      </h2>
      <p className={signoffSectionNote()}>
        {SAMPLE}. Dashed line and shaded area are a projection.
      </p>
      <div className={signoffTwoColumn()}>
        <div className={signoffWide()}>
          <div className={signoffPanel()}>
            <ChartFigure
              summary={chartSummary}
              title="Your net worth over the past year (sample data)"
            >
              <SampleChart />
            </ChartFigure>
            <ul className={legendList()} aria-label="Chart key">
              <li className={legendItem()}>
                <span className={legendSwatch({ series: "assets" })} aria-hidden="true" />
                Net worth
              </li>
              <li className={legendItem()}>
                <span className={legendSwatch({ series: "wealth" })} aria-hidden="true" />
                Savings
              </li>
              <li className={legendItem()}>
                <span className={legendSwatch({ series: "debt" })} aria-hidden="true" />
                Card debt
              </li>
              <li className={legendItem()}>
                <span className={legendSwatch({ series: "projection" })} aria-hidden="true" />
                Projection
              </li>
            </ul>
          </div>
        </div>
        <div className={signoffNarrow()}>
          <div className={signoffPanel()} data-density="compact">
            <h3 className={signoffPanelTitle()}>Accounts (sample data)</h3>
            <Table caption="Sample accounts with balance and change since last month">
              <THead>
                <tr>
                  <Th>Account</Th>
                  <Th numeric>Balance</Th>
                  <Th className={hideNarrow()} numeric>
                    Change
                  </Th>
                </tr>
              </THead>
              <TBody>
                {ACCOUNTS.map((a) => (
                  <tr key={a.name}>
                    <Td>
                      <span className={tableCellText()}>{a.name}</span>
                      <span className={tableCellSub()}>{a.kind}</span>
                    </Td>
                    <Td numeric>
                      <Money fractionDigits={2} size="sm" value={a.balance} />
                    </Td>
                    <Td className={hideNarrow()} numeric>
                      <Money fractionDigits={2} signDisplay="always" size="sm" value={a.change} />
                    </Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          </div>
        </div>
      </div>
    </section>

    <section aria-labelledby="signoff-status-title" className={signoffSection()}>
      <h2 className={signoffSectionTitle()} id="signoff-status-title">
        Status labels
      </h2>
      <p className={signoffSectionNote()}>{SAMPLE}. Every label carries an icon and words.</p>
      <div className={badgeRow()}>
        <StatusBadge icon={<Icon icon={Check} size="sm" />} variant="positive">
          Paid on time
        </StatusBadge>
        <StatusBadge icon={<Icon icon={Clock} size="sm" />} variant="warning">
          Due in 3 days
        </StatusBadge>
        <StatusBadge icon={<Icon icon={TriangleAlert} size="sm" />} variant="danger">
          Overdue
        </StatusBadge>
        <StatusBadge icon={<Icon icon={Info} size="sm" />} variant="info">
          Estimate
        </StatusBadge>
        <StatusBadge variant="neutral">Not linked</StatusBadge>
      </div>
    </section>

    <section aria-labelledby="signoff-section-empty" className={signoffSection()}>
      <h2 className={signoffSectionTitle()} id="signoff-section-empty">
        Empty states
      </h2>
      <div className={emptyWrap()}>
        <EmptyState
          action={<Button>Add a goal</Button>}
          description="Goals you add will appear here. This is sample data, so nothing has been saved."
          headingLevel="h3"
          id="signoff-empty"
          illustration={<Illustration scene="onboarding" size="lg" />}
          title="No goals yet"
        />
      </div>
    </section>
  </div>
);

export default DirectionCSignoff;
