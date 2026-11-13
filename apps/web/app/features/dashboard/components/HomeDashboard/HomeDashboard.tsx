import { evaluateFinancialStage } from "@flump/finance-engine";
import { Button, Icon, PageHeader, ProjectionNotice, SectionBand } from "@repo/ui";
import { SlidersHorizontal } from "lucide-react";
import { type FC, useMemo, useRef, useState } from "react";
import { normalizeProfile, type UserProfile, useUserProfile } from "~/hooks/useUserProfile";
import type { DebtSummary } from "~/utils/debtSummary";
import {
  ALL_PAGE_KEYS,
  type AppPageKey,
  type DashboardWidgetKey,
  DEFAULT_DASHBOARD_WIDGETS,
  DEFAULT_ENABLED_PAGES,
} from "~/utils/pageConfig";
import { AccountsWidget } from "../AccountsWidget";
import { BudgetWidget } from "../BudgetWidget";
import { DashboardEmptyState } from "../DashboardEmptyState";
import { DashboardKpiStrip } from "../DashboardKpiStrip";
import { DebtWidget } from "../DebtWidget";
import { MortgageWidget } from "../MortgageWidget";
import { PensionWidget } from "../PensionWidget";
import { SavingsWidget } from "../SavingsWidget";
import { SetupChecklist, type SetupChecklistProps } from "../SetupChecklist";
import { StageCoachCard } from "../StageCoachCard";
import { TaxWidget } from "../TaxWidget";
import { WidgetVisibilityPanel } from "../WidgetVisibilityPanel";
import { dashboardPage, showHideButton, widgetGrid } from "./HomeDashboard.styles";

export interface HomeDashboardProps {
  user: any;
  checklistProps: SetupChecklistProps;
  userProfile?: Partial<UserProfile> | UserProfile;
  accountsData: any;
  budgetData: any;
  savingsData: any;
  pensionData: any;
  mortgageData: any;
  forecastData: any;
  taxData: any;
  debtData?: DebtSummary | null;
  /**
   * Whether show or hide choices are saved to the user's profile. `false` keeps them in this
   * session only and never calls the backend (the signed-out sandbox).
   */
  persistVisibility?: boolean;
  /** Illustrative persona data (the sandbox): swaps "Welcome back" for an "Example snapshot" heading. */
  isSample?: boolean;
}

const finiteOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export const HomeDashboard: FC<HomeDashboardProps> = ({
  user,
  checklistProps,
  userProfile,
  accountsData,
  budgetData,
  savingsData,
  pensionData,
  mortgageData,
  forecastData,
  taxData,
  debtData,
  persistVisibility = true,
  isSample = false,
}) => {
  const { profile: hookProfile, updateProfile } = useUserProfile();
  const profile = useMemo(() => {
    if (userProfile) {
      return normalizeProfile(userProfile);
    }
    return hookProfile;
  }, [userProfile, hookProfile]);

  const [panelOpen, setPanelOpen] = useState(false);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  // Optimistic copy of dashboardWidgets while a change is saving, or the whole truth when not saved.
  const [visibilityOverride, setVisibilityOverride] = useState<DashboardWidgetKey[] | null>(null);

  // An empty budget means surplus, essentials and runway are unknown, not zero.
  const budgetKnown =
    (budgetData?.monthlyIncome ?? 0) > 0 || (budgetData?.monthlyExpenses ?? 0) > 0;

  // Financial Lifecycle Stage evaluation
  const financialStage = useMemo(() => {
    if (!debtData && !(accountsData?.totalLiabilities > 0)) {
      return null;
    }
    const debts = debtData?.debts ?? [];
    const stage = evaluateFinancialStage({
      debts,
      monthlySurplus: budgetData?.monthlySurplus ?? 0,
      liquidSavings: savingsData?.totalSavingsBalance ?? accountsData?.typeTotals?.Saving ?? 0,
      monthlyEssentialExpenses: budgetData?.monthlyExpenses ?? 0,
    });
    // Without a budget only the debt-driven stage is real; buffer/optimise depend on runway.
    return budgetKnown || stage.stage === "stabilize" ? stage : null;
  }, [debtData, accountsData, budgetData, savingsData, budgetKnown]);

  // Weekly safe to spend comes from the loader's financial picture (owner decision D-6-A);
  // null means it cannot be worked out yet, never a guessed split of living costs.
  const weeklySafeToSpend = finiteOrNull(budgetData?.safeToSpendWeekly);

  // Enabled pages according to UserProfile, in the fixed canonical order.
  const enabledPages = useMemo<AppPageKey[]>(() => {
    return (profile.enabledPages as AppPageKey[]) || DEFAULT_ENABLED_PAGES;
  }, [profile.enabledPages]);
  const applicableKeys = useMemo<DashboardWidgetKey[]>(
    () => ALL_PAGE_KEYS.filter((k) => enabledPages.includes(k)),
    [enabledPages],
  );

  // Widgets the user has chosen to show.
  const dashboardWidgets = useMemo<DashboardWidgetKey[]>(() => {
    const raw =
      visibilityOverride ??
      ((profile.dashboardWidgets as DashboardWidgetKey[]) || DEFAULT_DASHBOARD_WIDGETS);
    return raw.filter((k) => enabledPages.includes(k as AppPageKey));
  }, [visibilityOverride, profile.dashboardWidgets, enabledPages]);

  // Last list the backend confirmed (or, when not persisting, the last local choice). Used as the
  // revert target so a failed save never resurrects state from before an earlier successful one.
  const confirmedRef = useRef<DashboardWidgetKey[] | null>(null);
  const saveSeqRef = useRef(0);

  const handleToggleWidget = async (key: DashboardWidgetKey) => {
    const shown = new Set(dashboardWidgets);
    if (shown.has(key)) shown.delete(key);
    else shown.add(key);
    const next = applicableKeys.filter((k) => shown.has(k));
    const seq = ++saveSeqRef.current;

    setVisibilityError(null);
    setVisibilityOverride(next);
    if (!persistVisibility) {
      confirmedRef.current = next;
      return;
    }
    try {
      // Only dashboardWidgets is written: order, sizes and per-widget config are left alone.
      await updateProfile({ dashboardWidgets: next });
      confirmedRef.current = next;
      // A newer toggle owns the override now; otherwise the saved profile is the truth again.
      if (seq === saveSeqRef.current && !userProfile) setVisibilityOverride(null);
    } catch {
      if (seq !== saveSeqRef.current) return;
      setVisibilityOverride(confirmedRef.current);
      setVisibilityError("We could not save that change. Try again.");
    }
  };

  const isModuleConfigured = (key: DashboardWidgetKey): boolean => {
    switch (key) {
      case "accounts":
        return Boolean(checklistProps.hasAccounts || (accountsData?.accountsCount ?? 0) > 0);
      case "budget":
        return Boolean(
          checklistProps.hasBudget ||
            budgetData?.monthlyIncome > 0 ||
            budgetData?.monthlyExpenses > 0 ||
            checklistProps.completedSteps?.includes("budget"),
        );
      case "savings":
        return Boolean(
          (savingsData?.accountsCount ?? 0) > 0 ||
            checklistProps.hasSavings ||
            checklistProps.completedSteps?.includes("savings"),
        );
      case "pension":
        return Boolean(
          (pensionData?.potsCount ?? 0) > 0 ||
            checklistProps.hasPension ||
            checklistProps.completedSteps?.includes("pension"),
        );
      case "mortgage":
        return Boolean(
          (mortgageData?.hasMortgageAccount && mortgageData?.mortgageBalance > 0) ||
            checklistProps.hasMortgageAccount ||
            checklistProps.completedSteps?.includes("mortgage"),
        );
      case "tax":
        return Boolean(checklistProps.hasTax || (taxData?.recordsCount ?? 0) > 0);
      case "debt":
        return Boolean(
          (debtData?.totalDebt ?? 0) > 0 || checklistProps.completedSteps?.includes("debt"),
        );
      default:
        return false;
    }
  };

  // Shown widgets that are set up, in the fixed canonical order.
  const visibleWidgets = ALL_PAGE_KEYS.filter(
    (k) => dashboardWidgets.includes(k) && isModuleConfigured(k),
  );
  const anyShown = dashboardWidgets.length > 0;

  // KPI figures: unknown stays null (rendered "Not set"); only a real zero is £0.
  const hasAccounts = Boolean(checklistProps.hasAccounts || (accountsData?.accountsCount ?? 0) > 0);
  // Liquid cash (current and savings accounts) is the same figure months of cover divides.
  const liquidCash = hasAccounts ? finiteOrNull(accountsData?.liquidCash) : null;

  const showCoachCard = financialStage?.stage === "stabilize" && (debtData?.totalDebt ?? 0) > 0;

  // Greeting name comes from the WorkOS name (profile mirrors it); never a free-text display name.
  const greetingName =
    profile.firstName?.trim() ||
    user?.firstName?.trim() ||
    user?.user_metadata?.first_name?.trim() ||
    null;

  // Saved per-widget settings (read-only here) still apply; editing them is gone.
  const widgetConfig = (key: DashboardWidgetKey) => profile.dashboardWidgetConfig?.[key] ?? {};

  return (
    <div className={dashboardPage()}>
      <ProjectionNotice />
      <PageHeader
        actions={
          <Button
            aria-haspopup="dialog"
            className={showHideButton()}
            id="dashboard-show-hide"
            size="sm"
            variant="outline"
            onClick={() => setPanelOpen(true)}
          >
            <Icon icon={SlidersHorizontal} size="sm" />
            Show or hide widgets
          </Button>
        }
        subtitle={
          isSample
            ? "Sample data: illustrative figures, not yours."
            : "Your live financial snapshot across your active modules."
        }
        title={
          isSample ? "Example snapshot" : `Welcome back${greetingName ? `, ${greetingName}` : ""}`
        }
      />

      {showCoachCard && (
        <SectionBand id="dashboard-next" title="What to do next" variant="app">
          <StageCoachCard
            debtFreeDate={debtData?.debtFreeDate ?? null}
            unsecuredDebt={financialStage?.totalUnsecuredDebt || debtData?.totalDebt || 0}
            weeklyAllowance={weeklySafeToSpend}
          />
        </SectionBand>
      )}

      <SectionBand id="dashboard-stand" title="Where you stand" variant="app">
        <DashboardKpiStrip
          liquidCash={liquidCash}
          monthlySurplus={budgetKnown ? finiteOrNull(budgetData?.monthlySurplus) : null}
          netWorth={hasAccounts ? finiteOrNull(accountsData?.netWorth) : null}
          totalAssets={hasAccounts ? finiteOrNull(accountsData?.totalAssets) : null}
          totalLiabilities={hasAccounts ? finiteOrNull(accountsData?.totalLiabilities) : null}
          weeklySafeToSpend={weeklySafeToSpend}
        />
      </SectionBand>

      {/* Onboarding Checklist */}
      <SetupChecklist {...checklistProps} enabledPages={enabledPages} />

      <SectionBand id="dashboard-plans" title="Your plans at a glance" variant="app">
        {visibleWidgets.length === 0 ? (
          <DashboardEmptyState
            reason={anyShown ? "setup" : "hidden"}
            onChooseWidgets={() => setPanelOpen(true)}
          />
        ) : (
          <div className={widgetGrid()}>
            {visibleWidgets.map((key) => {
              switch (key) {
                case "accounts":
                  return <AccountsWidget key="accounts" data={accountsData} />;
                case "budget":
                  return (
                    <BudgetWidget
                      key="budget"
                      data={{
                        ...budgetData,
                        annualSalary:
                          profile.annualSalary ??
                          forecastData?.annualSalary ??
                          taxData?.totalIncome,
                      }}
                    />
                  );
                case "debt":
                  return <DebtWidget key="debt" data={debtData} />;
                case "savings":
                  return (
                    <SavingsWidget
                      key="savings"
                      config={widgetConfig("savings")}
                      data={savingsData}
                    />
                  );
                case "pension":
                  return (
                    <PensionWidget
                      key="pension"
                      data={pensionData}
                      targetRetirementAge={finiteOrNull(
                        widgetConfig("pension").targetRetirementAge,
                      )}
                    />
                  );
                case "mortgage":
                  return <MortgageWidget key="mortgage" data={mortgageData} />;
                case "tax":
                  return <TaxWidget key="tax" data={taxData} />;
                default:
                  return null;
              }
            })}
          </div>
        )}
      </SectionBand>

      <WidgetVisibilityPanel
        error={visibilityError}
        open={panelOpen}
        visibleKeys={dashboardWidgets}
        widgetKeys={applicableKeys}
        onOpenChange={setPanelOpen}
        onToggle={handleToggleWidget}
      />
    </div>
  );
};
