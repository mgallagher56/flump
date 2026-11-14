import { PortfolioSnapshot } from "@flump/finance-engine";
import {
  Button,
  EmptyState,
  Icon,
  Illustration,
  PageBody,
  PageHeader,
  ProjectionNotice,
  ScenarioZone,
  Tabs,
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
import { PayRiseScenario } from "~/features/savings/components/PayRiseScenario";
import {
  estimateIsaUsed,
  SavingsAccountsList,
} from "~/features/savings/components/SavingsAccountsList";
import {
  DEFAULT_FORECAST_YEARS,
  forecastOutcomeText,
  SavingsForecast,
  type SavingsForecastValues,
} from "~/features/savings/components/SavingsForecast";
import { SavingsSummaryCards } from "~/features/savings/components/SavingsSummaryCards";
import { useScenarioState } from "~/hooks/useScenarioState";
import { useUserProfile } from "~/hooks/useUserProfile";
import { emptyWrap, toolPanel } from "./SavingsContainer.styles";

/**
 * Monthly pay rise handed over from Take-home pay in router state (never the URL); 0 when absent
 * or invalid.
 */
export const parsePayRise = (state: unknown): number => {
  const value = Number((state as { payRise?: unknown } | null)?.payRise);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
};

const isSavingsType = (acc: Account) => acc.type === "Saving" || acc.type === "Investment";

const isStored = (value: unknown): boolean =>
  value !== undefined && value !== null && value !== "" && Number.isFinite(Number(value));

type Tool = "forecast" | "deposit";

export const SavingsContainer: FC = () => {
  const loaderData = useLoaderData<any>();
  const accounts: Account[] = loaderData?.accounts || [];
  const accountDetails: any[] = loaderData?.accountDetails || [];
  const userProfile = loaderData?.userProfile;

  const { setProfile, markChecklistStep } = useUserProfile();

  useEffect(() => {
    if (userProfile) setProfile(userProfile);
  }, [userProfile, setProfile]);

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

  useEffect(() => {
    if (savingsAccounts.length > 0) markChecklistStep("savings", true).catch(() => {});
  }, [savingsAccounts.length, markChecklistStep]);

  const saved = useMemo(() => {
    const total = savingsAccounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
    const withMonthly = savingsAccounts.filter((acc) => isStored(acc.monthlyContribution));
    const monthly =
      withMonthly.length > 0
        ? withMonthly.reduce((sum, acc) => sum + Number(acc.monthlyContribution), 0)
        : null;
    // Average AER over the accounts that store a rate, weighted by balance (simple mean when
    // those balances are all 0). Accounts without a rate are left out, never counted as 0%.
    const rated = savingsAccounts.filter((acc) => isStored(acc.interestRate));
    let averageRate: number | null = null;
    if (rated.length > 0) {
      const ratedBalance = rated.reduce((sum, acc) => sum + Math.max(0, Number(acc.balance)), 0);
      averageRate =
        ratedBalance > 0
          ? rated.reduce(
              (sum, acc) => sum + Math.max(0, Number(acc.balance)) * Number(acc.interestRate),
              0,
            ) / ratedBalance
          : rated.reduce((sum, acc) => sum + Number(acc.interestRate), 0) / rated.length;
    }
    return {
      total,
      monthly,
      averageRate,
      isaUsed: estimateIsaUsed(savingsAccounts),
    };
  }, [savingsAccounts]);

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

  return (
    <PageBody>
      <PageHeader
        actions={
          hasAccounts ? (
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Icon icon={Plus} size="sm" />
              Add account
            </Button>
          ) : undefined
        }
        description="Your balances, what you save each month and where it could get to."
        title="Your savings"
      />

      {hasAccounts ? (
        <>
          <SavingsSummaryCards
            accountCount={savingsAccounts.length}
            averageRate={saved.averageRate}
            isaUsed={saved.isaUsed}
            monthlySaving={saved.monthly}
            totalSavingsBalance={saved.total}
          />

          <SavingsAccountsList accounts={savingsAccounts} />

          <ScenarioZone
            announcement={announcement}
            basis="Starting from your saved accounts."
            id="savings-scenario"
            isModified={isModified}
            notice={<ProjectionNotice />}
            title="Model a change to your savings"
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
            illustration={<Illustration scene="onboarding" />}
            title="No savings accounts yet"
          />
        </div>
      )}

      <AddSavingsAccountDialog isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </PageBody>
  );
};

export default SavingsContainer;
