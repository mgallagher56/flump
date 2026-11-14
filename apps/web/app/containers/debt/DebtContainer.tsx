import {
  calculateDebtSchedule,
  compareAvalancheAndSnowball,
  type DebtItem,
  evaluateFinancialStage,
  PortfolioSnapshot,
} from "@flump/finance-engine";
import {
  Button,
  EmptyState,
  Icon,
  Illustration,
  PageHeader,
  ScenarioZone,
  SimulatorSplitLayout,
} from "@repo/ui";
import { BookOpen, CreditCard, type LucideIcon, TriangleAlert } from "lucide-react";
import { type FC, useMemo, useState } from "react";
import { Link, useFetcher, useLoaderData } from "react-router";
import { AddDebtDialog } from "~/features/debt/components/AddDebtDialog";
import { DebtAccountsList } from "~/features/debt/components/DebtAccountsList";
import { DebtHelpLink } from "~/features/debt/components/DebtHelpLink";
import { DebtSummary } from "~/features/debt/components/DebtSummary";
import { DebtToWealthBridgeCard } from "~/features/debt/components/DebtToWealthBridgeCard";
import { PayoffStrategySwitcher } from "~/features/debt/components/PayoffStrategySwitcher";
import { UkDebtInstrumentsCard } from "~/features/debt/components/UkDebtInstrumentsCard";
import { debtItemToAccountPayload } from "~/features/debt/utils/debtAccountMapping";
import { ConfirmDialog } from "~/features/feedback/components/ConfirmDialog";
import { useFetcherOutcome } from "~/features/feedback/hooks/useFetcherOutcome";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { useScenarioState } from "~/hooks/useScenarioState";
import { useUserProfile } from "~/hooks/useUserProfile";
import {
  controlsStack,
  errorBanner,
  footerLink,
  mutedNote,
  noteLink,
  pageRoot,
  promoAlert,
  promoAlertHeading,
  promoAlertRow,
  strong,
  tabButton,
  tabList,
} from "./DebtContainer.styles";

type DebtTab = "accounts" | "instruments";

const SAVED_SCENARIO = { extraPayment: 0, strategy: "avalanche" as "avalanche" | "snowball" };

export const DebtContainer: FC = () => {
  const loaderData = useLoaderData<any>();
  const { formatCurrency } = useFormatCurrency();
  const { profile } = useUserProfile();

  const debtInputs = loaderData?.debtInputs as
    | {
        monthlySurplus: number | null;
        liquidSavings: number;
        monthlyEssentialExpenses: number | null;
        totalDebt?: number;
      }
    | undefined;
  const monthlySurplus = debtInputs?.monthlySurplus ?? null;
  const budgetSurplus = monthlySurplus ?? 0;

  // Tab state
  const [activeTab, setActiveTab] = useState<DebtTab>("accounts");

  // Debts come straight from the user's liability accounts. Add, edit and delete persist through
  // the route action, and the loader revalidation refreshes this list.
  const accounts = loaderData?.accounts;
  const accountDetails = loaderData?.accountDetails;
  const debts = useMemo<DebtItem[]>(
    () => new PortfolioSnapshot(accounts ?? [], accountDetails ?? []).toDebtItems(),
    [accounts, accountDetails],
  );

  // Scenario state: container memory only (shared hook). It never reaches the KPI strip, the saved
  // list, the URL, storage or the network, and it starts at £0 (no invented or surplus default).
  const scenario = useScenarioState(SAVED_SCENARIO);
  const extraPayment = scenario.values.extraPayment;
  const selectedStrategy = scenario.values.strategy;
  const setExtraPayment = (amount: number) => scenario.set("extraPayment", amount);
  const setSelectedStrategy = (strategy: "avalanche" | "snowball") =>
    scenario.set("strategy", strategy);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Financial stage evaluation
  const stageEval = useMemo(() => {
    return evaluateFinancialStage({
      debts,
      monthlySurplus: budgetSurplus,
      liquidSavings: debtInputs?.liquidSavings ?? 0,
      monthlyEssentialExpenses: debtInputs?.monthlyEssentialExpenses ?? 0,
    });
  }, [debts, budgetSurplus, debtInputs?.liquidSavings, debtInputs?.monthlyEssentialExpenses]);

  // Strategy comparison and promotional cliff detection
  const comparison = useMemo(() => {
    return compareAvalancheAndSnowball(debts, extraPayment);
  }, [debts, extraPayment]);

  // Saved figures: minimum payments only. Used by the KPI strip and the 0% promo alert.
  const savedComparison = useMemo(() => compareAvalancheAndSnowball(debts, 0), [debts]);
  const savedSchedule = useMemo(() => calculateDebtSchedule(debts, 0, "AVALANCHE"), [debts]);
  const promoAlerts = savedSchedule.promoCliffAlerts.filter((a) => a.hasCliffRisk);

  const activeResult =
    selectedStrategy === "avalanche" ? comparison.avalanche : comparison.snowball;
  // Total debt is the picture's figure, so an overdrawn current account counts here as it does
  // on the dashboard (it is never a payoff item, so the schedules below leave it out).
  const totalDebt = debtInputs?.totalDebt ?? debts.reduce((sum, d) => sum + d.balance, 0);
  const totalMin = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const hasDebts = debts.length > 0;
  // An unset APR is modelled as 0%, which would invent optimistic dates and savings.
  const aprUnknown = debts.some((d) => d.aprKnown === false);
  const minimumEstimated = debts.some((d) => d.minimumPaymentEstimated === true);

  // Scenario outcome only; empty (nothing announced) until the extra payment is above £0, when
  // there are no debts, an APR is unknown (figures would be invented), minimum payments are
  // estimated or the payments never clear the debt.
  const debtHeadline =
    hasDebts &&
    scenario.isModified &&
    extraPayment > 0 &&
    !aprUnknown &&
    !minimumEstimated &&
    activeResult.payoffAchievable
      ? `debt-free by ${activeResult.debtFreeDate}, total interest ${formatCurrency(activeResult.totalInterest)}`
      : "";

  const fetcher = useFetcher();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const deleteOutcome = useFetcherOutcome(fetcher, { onSuccess: () => setConfirmDeleteId(null) });
  const debtToDelete = debts.find((d) => d.id === confirmDeleteId);
  const failedResult = fetcher.data as { success?: boolean; error?: string } | undefined;
  const saveError =
    debtToDelete === undefined && failedResult?.success === false
      ? (failedResult.error ?? "Something went wrong. Please try again.")
      : null;

  const handleAddDebt = (newDebt: Omit<DebtItem, "id">) => {
    const payload = debtItemToAccountPayload(newDebt);
    fetcher.submit(
      {
        intent: "createDebt",
        name: payload.name,
        type: payload.type,
        balance: String(payload.balance),
        interestRate: payload.interestRate === null ? "" : String(payload.interestRate),
        monthlyContribution:
          payload.monthlyContribution === null ? "" : String(payload.monthlyContribution),
      },
      { method: "POST", action: "/app/debt" },
    );
  };

  const handleConfirmDelete = (id: string) => {
    deleteOutcome.begin();
    fetcher.submit(
      { intent: "deleteDebt", accountId: id },
      { method: "POST", action: "/app/debt" },
    );
  };

  // Sends only the fields that changed. Balance is not sent: the edit dialog is limited to name,
  // APR and minimum payment.
  const handleUpdateDebt = (id: string, updates: Partial<DebtItem>) => {
    const current = debts.find((d) => d.id === id);
    if (!current) return;
    const payload = debtItemToAccountPayload({ ...current, ...updates });
    const fields: Record<string, string> = { intent: "updateDebt", accountId: id };
    if ("name" in updates) fields.name = payload.name;
    if ("apr" in updates || "aprKnown" in updates) {
      fields.interestRate = payload.interestRate === null ? "" : String(payload.interestRate);
    }
    if ("minimumPayment" in updates || "minimumPaymentEstimated" in updates) {
      fields.monthlyContribution =
        payload.monthlyContribution === null ? "" : String(payload.monthlyContribution);
    }
    if (Object.keys(fields).length === 2) return;
    fetcher.submit(fields, { method: "POST", action: "/app/debt" });
  };

  const tabItems: { id: DebtTab; label: string; icon: LucideIcon }[] = [
    {
      id: "accounts",
      label: hasDebts ? `Your debts (${debts.length})` : "Your debts",
      icon: CreditCard,
    },
    { id: "instruments", label: "UK debt rules and help", icon: BookOpen },
  ];
  const panelProps = (id: DebtTab) => ({
    "aria-labelledby": `debt-tab-${id}`,
    hidden: activeTab !== id,
    id: `debt-panel-${id}`,
    role: "tabpanel" as const,
    tabIndex: 0,
  });

  const controls = (
    <div className={controlsStack}>
      {monthlySurplus === null ? (
        <p className={mutedNote}>
          <Link className={noteLink} to="/app/budget">
            Set up your budget to see your monthly surplus
          </Link>
        </p>
      ) : null}
      {aprUnknown ? (
        <p className={mutedNote} data-testid="apr-unknown-note">
          Some debts have no APR set. The payoff plan assumes 0% for them, so its dates and interest
          may be too optimistic.
        </p>
      ) : null}
      <PayoffStrategySwitcher
        budgetSurplus={Math.max(0, budgetSurplus)}
        comparison={comparison}
        extraPayment={extraPayment}
        selectedStrategy={selectedStrategy}
        onChangeExtraPayment={setExtraPayment}
        onSelectStrategy={setSelectedStrategy}
      />
      {monthlySurplus === null ? (
        <p className={mutedNote} id="surplus-unknown-note">
          Illustrative only: we do not know your monthly surplus, so these payoff results assume the
          overpayment you choose is affordable.
        </p>
      ) : null}
    </div>
  );

  return (
    <div className={pageRoot}>
      <PageHeader
        subtitle="See how long your debts could take to clear, compare payoff orders and keep track of 0% offers."
        title="Your debts"
      />

      {promoAlerts.length > 0 && (
        <section aria-labelledby="debt-promo-alert-title" className={promoAlert()}>
          <h2 className={promoAlertHeading} id="debt-promo-alert-title">
            <Icon icon={TriangleAlert} size="sm" />
            0% balance transfer ending soon
          </h2>
          {promoAlerts.map((alert) => (
            <div className={promoAlertRow()} key={alert.debtId}>
              <p>
                <strong className={strong}>{alert.debtName}</strong>: the 0% rate ends on{" "}
                <strong className={strong}>{alert.promoExpiryDate}</strong>. At your current
                payments,{" "}
                <span className={strong}>{formatCurrency(alert.projectedBalanceAtExpiryGbp)}</span>{" "}
                would then be charged at <strong className={strong}>{alert.revertApr}% APR</strong>.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setExtraPayment(alert.requiredMonthlyToClearBeforeCliff)}
              >
                Model {formatCurrency(alert.requiredMonthlyToClearBeforeCliff)} a month
              </Button>
            </div>
          ))}
        </section>
      )}

      {saveError ? (
        <p className={errorBanner} role="alert">
          {saveError}
        </p>
      ) : null}

      {hasDebts ? (
        <DebtSummary
          aprUnknown={aprUnknown}
          debtFreeDate={savedComparison.minimumOnly.debtFreeDate}
          highInterestDebt={stageEval.highInterestDebt}
          minimumEstimated={minimumEstimated}
          monthlyMinimumTotal={totalMin}
          payoffAchievable={savedComparison.minimumOnly.payoffAchievable}
          totalDebt={totalDebt}
          totalInterest={savedComparison.minimumOnly.totalInterest}
        />
      ) : null}

      {/* Roving-tabindex tabs on plain buttons, as on the mortgage page.
          TODO(E15 Phase 2): adopt @repo/ui SegmentedTabs once it renders its panels; today its
          aria-controls point at panels that do not exist, which axe flags. */}
      <div aria-label="Debt tools" className={tabList()} role="tablist">
        {tabItems.map((tab, index) => (
          <button
            aria-controls={`debt-panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            className={tabButton({ active: activeTab === tab.id })}
            id={`debt-tab-${tab.id}`}
            key={tab.id}
            role="tab"
            tabIndex={activeTab === tab.id ? 0 : -1}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => {
              if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
              const last = tabItems.length - 1;
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % tabItems.length
                  : event.key === "ArrowLeft"
                    ? (index + last) % tabItems.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? last
                        : null;
              if (next === null) return;
              event.preventDefault();
              setActiveTab(tabItems[next].id);
              document.getElementById(`debt-tab-${tabItems[next].id}`)?.focus();
            }}
          >
            <Icon icon={tab.icon} size="sm" />
            {tab.label}
          </button>
        ))}
      </div>

      <div {...panelProps("accounts")}>
        {hasDebts ? (
          <DebtAccountsList
            debts={debts}
            onAddDebt={() => setIsAddModalOpen(true)}
            onDeleteDebt={(id) => setConfirmDeleteId(id)}
            onUpdateDebt={handleUpdateDebt}
          />
        ) : (
          <EmptyState
            action={
              <Button type="button" onClick={() => setIsAddModalOpen(true)}>
                Add debt
              </Button>
            }
            description="Add your credit cards, loans and overdrafts to compare payoff plans."
            illustration={<Illustration scene="empty-accounts" />}
            title="No debts yet"
          />
        )}
      </div>

      {/* The scenario zone stays mounted so the illustration survives a tab switch. */}
      {hasDebts ? (
        <ScenarioZone
          announcement={debtHeadline}
          basis={`Starting from your figures: ${formatCurrency(totalDebt)} owed across ${debts.length} ${
            debts.length === 1 ? "debt" : "debts"
          }, ${formatCurrency(totalMin)} a month in minimums`}
          footer={
            <button
              className={footerLink}
              type="button"
              onClick={() => {
                setActiveTab("accounts");
                document.getElementById("debt-tab-accounts")?.focus();
              }}
            >
              Update your details
            </button>
          }
          isModified={scenario.isModified}
          title="Model a change to your debts"
          onReset={scenario.reset}
        >
          <SimulatorSplitLayout
            content={
              <DebtToWealthBridgeCard
                debts={debts}
                extraPayment={extraPayment}
                strategy={selectedStrategy}
              />
            }
            contentLabel="Debt payoff results"
            controls={controls}
            controlsLabel="Payoff settings"
            controlsSpan={5}
          />
        </ScenarioZone>
      ) : null}

      <div {...panelProps("instruments")}>
        <UkDebtInstrumentsCard />
      </div>

      {/* Shown to every user in the same place, never triggered by their figures (R3 exception, R4). */}
      <DebtHelpLink />

      <ConfirmDialog
        confirmLabel="Delete debt"
        description="This deletes the account and its history. This can't be undone."
        error={deleteOutcome.error}
        open={debtToDelete !== undefined}
        pending={deleteOutcome.pending}
        title={`Delete ${debtToDelete?.name ?? "debt"}?`}
        tone="danger"
        onConfirm={() => {
          if (confirmDeleteId) handleConfirmDelete(confirmDeleteId);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDeleteId(null);
            deleteOutcome.dismiss();
          }
        }}
      />

      <AddDebtDialog
        isOpen={isAddModalOpen}
        onAddDebt={handleAddDebt}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};

export default DebtContainer;
