import {
  Card,
  CollapsibleDrawer,
  EmptyState,
  Illustration,
  Money,
  Table,
  Tabs,
  TBody,
  Td,
  THead,
  Th,
  Tr,
} from "@repo/ui";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { useLoaderData } from "react-router";
import AccountDetailChart from "~/components/charts/AccountDetailChart";
import { toDisplayBalance } from "~/containers/accounts/utils";
import { londonMonth } from "~/features/snapshot/snapshotModel";
import type { loader } from "~/routes/app.accounts.$account";
import { isFutureMonth } from "~/utils/accounts";
import {
  chartBox,
  chartEmpty,
  detailsRoot,
  drawerWrap,
  monthCell,
  mutedFigure,
  panel,
  section,
  sectionTitle,
  sourceTag,
} from "./AccountDetails.styles";

type DetailsTab = "chart" | "ledger";

/** Law 3: a ledger over eight rows keeps the rest behind a drawer. */
const VISIBLE_ROWS = 8;

const monthName = (month: number, year: number) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );

interface LedgerRow {
  key: string;
  label: string;
  balance: number;
  change: number | null;
  /** "Calculated" or "No change" from the check-in (R2-5); null for a typed figure. */
  sourceLabel: string | null;
}

/** How a month's figure was given, when it was not typed: shown wherever the figure appears. */
export const sourceLabel = (source: unknown): string | null =>
  source === "calculated" ? "Calculated" : source === "confirmed" ? "No change" : null;

interface YearRow {
  year: number;
  yearEnd: number;
  average: number;
  change: number;
}

/** Balance history as a chart, and the month-by-month ledger on its own tab. */
const AccountDetails: FC = () => {
  const { accountDetails = [], account } = useLoaderData<typeof loader>();
  const [tab, setTab] = useState<DetailsTab>("chart");

  const { chartDetails, ledgerRows, yearRows } = useMemo(() => {
    const sorted = [...accountDetails]
      .map((d: any) => ({
        month: Number(d.month),
        year: Number(d.year),
        value: toDisplayBalance(account?.type, Number(d.value)),
        source: d.source as unknown,
      }))
      .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));

    const ledger: LedgerRow[] = sorted.map((detail, index) => ({
      key: `${detail.year}-${detail.month}`,
      label: monthName(detail.month, detail.year),
      balance: detail.value,
      change: index > 0 ? detail.value - sorted[index - 1].value : null,
      sourceLabel: sourceLabel(detail.source),
    }));

    const years: YearRow[] = [];
    for (const year of Array.from(new Set(sorted.map((d) => d.year))).sort((a, b) => b - a)) {
      const known = sorted.filter((d) => d.year === year && d.value !== 0);
      if (known.length === 0) continue;
      years.push({
        year,
        yearEnd: known[known.length - 1].value,
        average: known.reduce((sum, d) => sum + d.value, 0) / known.length,
        change: known[known.length - 1].value - known[0].value,
      });
    }

    // The chart ends on the figure the hero shows: with this month not recorded yet, the saved
    // balance (D22) is this month's point, as on the net worth history chart.
    const past = sorted.filter((d) => !isFutureMonth(d.month, d.year));
    const [cy, cm] = londonMonth().split("-").map(Number) as [number, number];
    const saved = account?.balance;
    const hasCurrent = past.some((d) => d.year === cy && d.month === cm);
    const chart =
      !hasCurrent && saved !== undefined && saved !== null && past.length > 0
        ? [
            ...past,
            {
              month: cm,
              year: cy,
              value: toDisplayBalance(account?.type, Number(saved)),
              source: undefined as unknown,
            },
          ]
        : past;

    return {
      chartDetails: chart,
      ledgerRows: ledger.reverse(),
      yearRows: years,
    };
  }, [accountDetails, account?.type, account?.balance]);

  if (!accountDetails || accountDetails.length === 0) {
    return (
      <Card padding="none">
        <EmptyState
          description="Record this account's balance each month and its history shows here."
          headingLevel="h3"
          illustration={<Illustration scene="onboarding" />}
          title="No balance history yet"
        />
      </Card>
    );
  }

  const ledgerTable = (rows: LedgerRow[], caption: string) => (
    <Table appearance="soft" caption={caption} stacked>
      <THead>
        <Tr>
          <Th>Month</Th>
          <Th numeric>Balance</Th>
          <Th numeric>Change on last month</Th>
        </Tr>
      </THead>
      <TBody>
        {rows.map((row) => (
          <Tr key={row.key}>
            <Td>
              <span className={monthCell()}>{row.label}</span>
            </Td>
            <Td label="Balance" numeric>
              <Money size="sm" value={row.balance} />
              {row.sourceLabel ? <span className={sourceTag()}>{row.sourceLabel}</span> : null}
            </Td>
            <Td label="Change on last month" numeric>
              {row.change === null ? (
                <span className={mutedFigure()}>First month</span>
              ) : (
                <Money signDisplay="always" size="sm" tone="muted" value={row.change} />
              )}
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );

  const visible = ledgerRows.slice(0, VISIBLE_ROWS);
  const rest = ledgerRows.slice(VISIBLE_ROWS);

  return (
    <div className={detailsRoot()}>
      <Tabs
        aria-label="Account history views"
        items={[
          { value: "chart", label: "Balance over time" },
          { value: "ledger", label: "Month by month" },
        ]}
        panelClassName={panel()}
        panels={{
          chart: (
            <Card>
              <div className={chartBox()}>
                {chartDetails.length > 0 ? (
                  <AccountDetailChart
                    accountDetails={chartDetails}
                    showAxes
                    title={`${account?.name ?? "Account"} balance history`}
                  />
                ) : (
                  <div className={chartEmpty()}>
                    The chart appears once this account has more monthly balances.
                  </div>
                )}
              </div>
            </Card>
          ),
          ledger: (
            <>
              <section aria-labelledby="account-ledger-heading" className={section()}>
                <h2 className={sectionTitle()} id="account-ledger-heading">
                  Month by month
                </h2>
                <Card padding="none">
                  {ledgerTable(visible, "Monthly balances, newest first")}
                  {rest.length > 0 && (
                    <div className={drawerWrap()}>
                      <CollapsibleDrawer
                        itemCount={rest.length}
                        itemNoun={{ one: "month", other: "months" }}
                        title="Show earlier months"
                        variant="quiet"
                      >
                        {ledgerTable(rest, "Earlier monthly balances")}
                      </CollapsibleDrawer>
                    </div>
                  )}
                </Card>
              </section>
              {yearRows.length > 0 && (
                <section aria-labelledby="account-years-heading" className={section()}>
                  <h2 className={sectionTitle()} id="account-years-heading">
                    Year by year
                  </h2>
                  <Card padding="none">
                    <Table appearance="soft" caption="Balance by year" stacked>
                      <THead>
                        <Tr>
                          <Th>Year</Th>
                          <Th numeric>Year-end balance</Th>
                          <Th numeric>Monthly average</Th>
                          <Th numeric>Change in year</Th>
                        </Tr>
                      </THead>
                      <TBody>
                        {yearRows.map((row) => (
                          <Tr key={row.year}>
                            <Td>
                              <span className={monthCell()}>{row.year}</span>
                            </Td>
                            <Td label="Year-end balance" numeric>
                              <Money size="sm" value={row.yearEnd} />
                            </Td>
                            <Td label="Monthly average" numeric>
                              <Money size="sm" value={row.average} />
                            </Td>
                            <Td label="Change in year" numeric>
                              <Money
                                signDisplay="always"
                                size="sm"
                                tone="muted"
                                value={row.change}
                              />
                            </Td>
                          </Tr>
                        ))}
                      </TBody>
                    </Table>
                  </Card>
                </section>
              )}
            </>
          ),
        }}
        value={tab}
        onValueChange={(value) => setTab(value as DetailsTab)}
      />
    </div>
  );
};

export default AccountDetails;
