import {
  balanceWeightedRate,
  estimateSavingsInterestNext12Months,
  getUkTaxYearContext,
  PortfolioSnapshot,
  totalMonthlySavingAtShare,
} from "@flump/finance-engine";
import {
  Button,
  EmptyState,
  Icon,
  PageBody,
  PageHeader,
  ProjectionNotice,
  ScenarioZone,
  Tabs,
  TaxRatesStatusBanner,
} from "@repo/ui";
import { Plus } from "lucide-react";
import { type FC, useEffect, useMemo, useState } from "react";
import { useLoaderData, useLocation, useNavigate } from "react-router";
import type { Account } from "~/containers/accounts/types";
import { AddSavingsAccountDialog } from "~/features/savings/components/AddSavingsAccountDialog";
import {
  DepositTimeline,
  type DepositTimelineValues,
  defaultDepositTarget,
  depositOutcomeText,
} from "~/features/savings/components/DepositTimeline";
import { InvestmentReturns } from "~/features/savings/components/InvestmentReturns";
import { PayRiseScenario } from "~/features/savings/components/PayRiseScenario";
import {
  isIsaAccount,
  SavingsAccountsList,
} from "~/features/savings/components/SavingsAccountsList";
import {
  DEFAULT_FORECAST_YEARS,
  forecastOutcomeText,
  SavingsForecast,
  type SavingsForecastValues,
} from "~/features/savings/components/SavingsForecast";
import { SavingsSummaryCards } from "~/features/savings/components/SavingsSummaryCards";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { useScenarioState } from "~/hooks/useScenarioState";
import { emptyWrap, toolPanel, zoneSummary } from "./SavingsContainer.styles";

/**
 * Monthly pay rise handed over from Take-home pay in router state (never the URL); 0 when absent
 * or invalid.
 */
export const parsePayRise = (state: unknown): number => {
  const value = Number((state as { payRise?: unknown } | null)?.payRise);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
};

const isSavingsType = (acc: Account) => acc.type === "Saving" || acc.type === "Investment";

type Tool = "forecast" | "deposit";

/** The drawer and the zone share one name, so the drawer's button is named for what it opens. */
export const SCENARIO_TITLE = "Model a change to your savings";

/** The text with a full stop at the end, unless it already ends with one. */
export const withFullStop = (text: string): string => (text.endsWith(".") ? text : `${text}.`);

export const SavingsContainer: FC = () => {
  const loaderData = useLoaderData<any>();
  const { formatCurrency } = useFormatCurrency();
  const accounts: Account[] = loaderData?.accounts || [];
  const accountDetails: any[] = loaderData?.accountDetails || [];

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [tool, setTool] = useState<Tool>("forecast");

  // Scenario input only: the extra monthly take-home from a pay rise modelled on Take-home pay
  // (arrives in router state). It feeds the forecast, never the saved figures above it.
  const location = useLocation();
  const [payRiseMonthly, setPayRiseMonthly] = useState(() => parsePayRise(location?.state));
  const navigate = useNavigate();
  const removePayRise = () => {
    setPayRiseMonthly(0);
    // Clear the handed-over state so a reload does not bring the pay rise back.
    navigate(`${location?.pathname ?? "/app/savings"}${location?.hash ?? ""}`, {
      replace: true,
      state: null,
      // Same page: the reader stays where the button was, not at the top.
      preventScrollReset: true,
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Take-home pay moved to its own page (T-IA-3): old #takehome links go there.
    if (window.location.hash === "#takehome") navigate("/app/take-home", { replace: true });
  }, [navigate]);

  useEffect(() => {
    const payRise = parsePayRise(location?.state);
    if (payRise > 0) setPayRiseMonthly(payRise);
  }, [location?.state]);

  // Saved figures only: these feed the hero and the KPI strip, and seed the scenario inputs.
  const savingsAccounts = useMemo(() => {
    const snapshot = new PortfolioSnapshot(accounts, accountDetails);
    return accounts.filter(isSavingsType).map((acc) => ({
      ...acc,
      balance: snapshot.getAccount(acc.id)?.nominalBalance ?? (Number(acc.balance) || 0),
    }));
  }, [accounts, accountDetails]);

  // No checklist write here: the Dashboard reads the savings step as done once a savings account
  // exists, so opening this page never writes to the profile (LD-2, CS-6).

  // The total and the ISA allowance used come from the shared loader's picture (audit slice 3),
  // the figures the Dashboard and the AI read.
  const savingsBalance: number = loaderData?.savingsBalance ?? 0;
  const isaAllowanceUsed: number | null = loaderData?.isaAllowanceUsed ?? null;

  const saved = useMemo(() => {
    const total = savingsBalance;
    // `balance` is at the user's share (PortfolioSnapshot), while `monthlyContribution` is the
    // whole stored saving: the engine scales it by the share so both are on one basis.
    const monthly = totalMonthlySavingAtShare(savingsAccounts);
    return {
      total,
      monthly,
      // Seeds the what-if forecast only. The headline shows interest in pounds instead: one
      // blended rate across ISA and non-ISA savings hides that ISA interest is tax-free.
      averageRate: balanceWeightedRate(savingsAccounts),
      interest: estimateSavingsInterestNext12Months(savingsAccounts),
      isaUsed: isaAllowanceUsed,
    };
  }, [savingsAccounts, savingsBalance, isaAllowanceUsed]);

  // What-if inputs, in memory only (useScenarioState): nothing here reaches saved data.
  const savedForecast = useMemo<SavingsForecastValues>(
    () => ({
      monthly: saved.monthly,
      rate: saved.averageRate === null ? null : Math.round(saved.averageRate * 10) / 10,
      years: DEFAULT_FORECAST_YEARS,
      todaysMoney: false,
      goal: null,
    }),
    [saved.monthly, saved.averageRate],
  );
  const forecast = useScenarioState(savedForecast);

  const savedDeposit = useMemo<DepositTimelineValues>(
    () => ({
      // A default target so the tab never opens empty: an illustration, not a suggested goal.
      targetDeposit: defaultDepositTarget(saved.total),
      monthlySaving: saved.monthly,
      startingAmount: saved.total,
    }),
    [saved.monthly, saved.total],
  );
  const deposit = useScenarioState(savedDeposit);

  // A handed-over pay rise is a scenario input too: it marks the zone modified and Reset clears it.
  const isModified = forecast.isModified || deposit.isModified || payRiseMonthly > 0;
  const resetScenario = () => {
    forecast.reset();
    deposit.reset();
    if (payRiseMonthly > 0) removePayRise();
  };
  const announcement =
    tool === "forecast"
      ? forecast.isModified
        ? forecastOutcomeText(forecast.values, saved.total, payRiseMonthly)
        : ""
      : deposit.isModified
        ? depositOutcomeText(deposit.values)
        : "";

  const hasAccounts = savingsAccounts.length > 0;
  const ratesContext = useMemo(() => getUkTaxYearContext(), []);

  return (
    <PageBody>
      <PageHeader
        actions={
          hasAccounts ? (
            // Compact, the same as "Add pension pot", so at 375 it does not push the hero down.
            <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
              <Icon icon={Plus} size="sm" />
              Add account
            </Button>
          ) : undefined
        }
        description="Your balances, what you save each month and where it could get to."
        // The page icon, empty or filled in; the empty state below has none, so one is in view.
        illustration="empty-savings"
        title="Your savings"
      />

      <TaxRatesStatusBanner {...ratesContext} />

      {hasAccounts ? (
        <>
          <SavingsSummaryCards
            accountCount={savingsAccounts.length}
            interest={saved.interest}
            hasIsaAccount={savingsAccounts.some((acc) => isIsaAccount(acc))}
            isaUsed={saved.isaUsed}
            monthlySaving={saved.monthly}
            totalSavingsBalance={saved.total}
          />

          <SavingsAccountsList
            accounts={savingsAccounts}
            savedAccounts={accounts.filter(isSavingsType)}
          />

          <InvestmentReturns accounts={accounts} accountDetails={accountDetails} />

          {/* Below saved figures, the model starts closed and keeps a one-line summary (UX S11).
              A pay rise handed over from Take-home pay opens it. */}
          <ScenarioZone
            announcement={announcement}
            basis="Starting from your saved accounts."
            collapsible
            defaultOpen={payRiseMonthly > 0}
            id="savings-scenario"
            isModified={isModified}
            showLabel="Show what-if: grow your savings"
            summary={
              <span className={zoneSummary()}>
                {announcement
                  ? `Your illustration: ${withFullStop(announcement)}`
                  : saved.monthly > 0
                    ? `Starts from your savings of ${formatCurrency(saved.total)} and ${formatCurrency(saved.monthly)} a month going in.`
                    : `Starts from your savings of ${formatCurrency(saved.total)}.`}
              </span>
            }
            notice={<ProjectionNotice />}
            title={SCENARIO_TITLE}
            tools={
              <Tabs
                aria-label="Ways to model your savings"
                items={[
                  { value: "forecast", label: "How it could grow" },
                  { value: "deposit", label: "Time to a target" },
                ]}
                panelClassName={toolPanel()}
                panels={{
                  forecast: (
                    <SavingsForecast
                      payRise={
                        payRiseMonthly > 0 ? (
                          <PayRiseScenario
                            monthlyIncrease={payRiseMonthly}
                            onRemove={removePayRise}
                          />
                        ) : undefined
                      }
                      payRiseMonthly={payRiseMonthly}
                      startingBalance={saved.total}
                      values={forecast.values}
                      onChange={(key, value) => forecast.set(key, value)}
                    />
                  ),
                  deposit: (
                    <DepositTimeline
                      saved={savedDeposit}
                      values={deposit.values}
                      onChange={(key, value) => deposit.set(key, value)}
                    />
                  ),
                }}
                size="sm"
                value={tool}
                onValueChange={(value) => setTool(value as Tool)}
              />
            }
            onReset={resetScenario}
          />
        </>
      ) : (
        <div className={emptyWrap()}>
          <EmptyState
            action={
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Icon icon={Plus} size="sm" />
                Add an account
              </Button>
            }
            description="Add a savings account or investment to see your total, what you save each month and where it could get to."
            headingLevel="h2"
            id="savings-empty"
            title="No savings accounts yet"
          />
        </div>
      )}

      <AddSavingsAccountDialog isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </PageBody>
  );
};

export default SavingsContainer;
