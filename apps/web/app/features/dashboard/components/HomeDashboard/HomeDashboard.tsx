import {
  Button,
  DELTA_PANEL_COPY,
  formatMoney,
  HeroFigure,
  Icon,
  PageBody,
  PageHeader,
  ProjectionNotice,
  VisuallyHidden,
} from "@repo/ui";
import { SlidersHorizontal } from "lucide-react";
import { type FC, type ReactNode, useMemo, useRef, useState } from "react";
import { SampleAwareLink } from "~/components/navigation/SampleAwareLink";
import {
  MonthlyCheckInCard,
  type MonthlyCheckInCardProps,
} from "~/features/snapshot/components/MonthlyCheckInCard";
import { londonMonth } from "~/features/snapshot/snapshotModel";
import { normalizeProfile, type UserProfile, useUserProfile } from "~/hooks/useUserProfile";
import type { DebtSummary } from "~/utils/debtSummary";
import {
  ALL_PAGE_KEYS,
  type AppPageKey,
  type DashboardWidgetKey,
  DEFAULT_DASHBOARD_WIDGETS,
  DEFAULT_ENABLED_PAGES,
} from "~/utils/pageConfig";
import { netWorthDelta, type PriorNetWorth } from "../../netWorthDelta";
import { AccountsWidget } from "../AccountsWidget";
import { BudgetWidget } from "../BudgetWidget";
import { DashboardEmptyState } from "../DashboardEmptyState";
import { DashboardKpiStrip, stripShowsDebt } from "../DashboardKpiStrip";
import { DebtWidget, debtCardShowsEstimate } from "../DebtWidget";
import { MortgageWidget } from "../MortgageWidget";
import { PensionWidget } from "../PensionWidget";
import { SavingsWidget } from "../SavingsWidget";
import { SetupChecklist, type SetupChecklistProps } from "../SetupChecklist";
import { TaxWidget, taxCardShowsEstimate } from "../TaxWidget";
import { WidgetVisibilityPanel } from "../WidgetVisibilityPanel";
import {
  housekeepingGroup,
  sectionHeading,
  sectionsRegion,
  showHideButton,
  widgetGrid,
} from "./HomeDashboard.styles";

export interface HomeDashboardProps {
  user?: unknown;
  checklistProps: SetupChecklistProps;
  /** E30 monthly check-in; omitted in the signed-out sandbox. */
  checkIn?: MonthlyCheckInCardProps | null;
  /** The latest recorded month before this one, for the hero's one delta. */
  netWorthPrior?: PriorNetWorth | null;
  userProfile?: Partial<UserProfile> | UserProfile;
  accountsData: any;
  budgetData: any;
  savingsData: any;
  pensionData: any;
  mortgageData: any;
  forecastData?: unknown;
  taxData: any;
  debtData?: DebtSummary | null;
  /**
   * Whether "Choose what shows here" choices are saved to the user's profile. `false` keeps them
   * in this session only and never calls the backend (the signed-out sandbox).
   */
  persistVisibility?: boolean;
  /** Illustrative persona data (the sandbox). */
  isSample?: boolean;
  /** Drawn first inside the page body (the sandbox's sample-data bar). */
  banner?: ReactNode;
  /** Drawn last inside the page body (the sandbox's closing sign-up). */
  footer?: ReactNode;
}

export const HERO_LABEL = "Net worth";
/** The hero label when net worth includes the home at the user's own estimate (D3). */
export const HERO_LABEL_WITH_HOME = "Net worth, including your home estimate";

/** At most four section cards render (plan D1, E16 P1.8). */
export const MAX_SECTION_CARDS = 4;

/**
 * Which sections are most useful on the dashboard, first to last. Debt, mortgage, savings and
 * pension show figures found nowhere else on the page; budget and accounts mostly repeat the hero
 * and the KPI strip, so they come last.
 */
export const SECTION_PRIORITY: readonly DashboardWidgetKey[] = [
  "debt",
  "mortgage",
  "savings",
  "pension",
  "tax",
  "budget",
  "accounts",
];

/** The cards to draw: the most relevant `max` of `available`, in the fixed dashboard order. */
export const selectSectionCards = (
  available: readonly DashboardWidgetKey[],
  max = MAX_SECTION_CARDS,
): DashboardWidgetKey[] => {
  const chosen = new Set(SECTION_PRIORITY.filter((k) => available.includes(k)).slice(0, max));
  return ALL_PAGE_KEYS.filter((k) => chosen.has(k));
};

const finiteOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/** The hero value with its `data-figure` hook; a minus is spoken as "minus". */
const heroValue = (netWorth: number) => {
  const formatted = formatMoney(netWorth, { fractionDigits: 0 });
  return (
    <span data-figure="netWorth">
      {formatted.spoken ? (
        <>
          <span aria-hidden="true">{formatted.text}</span>
          <VisuallyHidden>{formatted.spoken}</VisuallyHidden>
        </>
      ) : (
        formatted.text
      )}
    </span>
  );
};

/**
 * The dashboard (E16 PR 4): h1, the net worth hero with at most one delta, a strip of three
 * supporting figures, the setup and check-in rows when they apply, then up to four section cards
 * with one notice at their foot when a card shows an estimate. Every figure is a saved fact or
 * labelled as an estimate, and none repeats.
 */
export const HomeDashboard: FC<HomeDashboardProps> = ({
  checklistProps,
  checkIn = null,
  netWorthPrior = null,
  userProfile,
  accountsData,
  budgetData,
  savingsData,
  pensionData,
  mortgageData,
  taxData,
  debtData,
  persistVisibility = true,
  isSample = false,
  banner,
  footer,
}) => {
  const { profile: hookProfile, updateProfile } = useUserProfile();
  const profile = useMemo(
    () => (userProfile ? normalizeProfile(userProfile) : hookProfile),
    [userProfile, hookProfile],
  );

  const [panelOpen, setPanelOpen] = useState(false);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  // Optimistic copy of dashboardWidgets while a change is saving, or the whole truth when not saved.
  const [visibilityOverride, setVisibilityOverride] = useState<DashboardWidgetKey[] | null>(null);

  // An empty budget means what is left over and months of cover are unknown, not zero. The
  // loader's picture decides; sample data (no budgetKnown field) falls back to its own totals.
  const budgetKnown =
    typeof budgetData?.budgetKnown === "boolean"
      ? budgetData.budgetKnown
      : (budgetData?.monthlyIncome ?? 0) > 0 || (budgetData?.monthlyExpenses ?? 0) > 0;

  // Enabled pages according to UserProfile, in the fixed canonical order.
  const enabledPages = useMemo<AppPageKey[]>(
    () => (profile.enabledPages as AppPageKey[]) || DEFAULT_ENABLED_PAGES,
    [profile.enabledPages],
  );
  const applicableKeys = useMemo<DashboardWidgetKey[]>(
    () => ALL_PAGE_KEYS.filter((k) => enabledPages.includes(k)),
    [enabledPages],
  );

  // Sections the user has chosen to show.
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
      // Only dashboardWidgets is written: order, sizes and per-section config are left alone.
      await updateProfile({ dashboardWidgets: next });
      confirmedRef.current = next;
      // A newer toggle owns the override now; otherwise the saved profile is the truth again.
      if (seq === saveSeqRef.current && !userProfile) setVisibilityOverride(null);
    } catch {
      if (seq !== saveSeqRef.current) return;
      setVisibilityOverride(confirmedRef.current);
      setVisibilityError("We could not save that change. Your dashboard is unchanged. Try again.");
    }
  };

  const hasAccounts = Boolean(checklistProps.hasAccounts || (accountsData?.accountsCount ?? 0) > 0);

  const hasData = (key: DashboardWidgetKey): boolean => {
    switch (key) {
      case "accounts":
        return hasAccounts;
      case "budget":
        return Boolean(checklistProps.hasBudget || budgetKnown);
      case "savings":
        return Boolean((savingsData?.accountsCount ?? 0) > 0 || checklistProps.hasSavings);
      case "pension":
        return Boolean((pensionData?.potsCount ?? 0) > 0 || checklistProps.hasPension);
      case "mortgage":
        return Boolean(
          (mortgageData?.hasMortgageAccount && mortgageData?.mortgageBalance) ||
            checklistProps.hasMortgageAccount,
        );
      case "tax":
        return Boolean(checklistProps.hasTax || (taxData?.recordsCount ?? 0) > 0);
      case "debt":
        return (debtData?.totalDebt ?? 0) > 0;
      default:
        return false;
    }
  };

  const cards = selectSectionCards(dashboardWidgets.filter(hasData));
  const anyShown = dashboardWidgets.length > 0;

  // Figures: unknown stays null (rendered "Not set"); only a real zero is £0.
  const netWorth = hasAccounts ? finiteOrNull(accountsData?.netWorth) : null;
  const homeEstimate = hasAccounts ? finiteOrNull(accountsData?.homeEstimate) : null;
  const totalOwed = finiteOrNull(debtData?.totalDebt);
  const pensionPot =
    (pensionData?.potsCount ?? 0) > 0 ? finiteOrNull(pensionData?.totalPensionBalance) : null;
  const currentMonth = checkIn?.currentMonth ?? londonMonth();
  const delta = netWorthDelta(netWorth, netWorthPrior, currentMonth);
  // D3: when net worth counts the user's own home estimate, the hero label says so in every case,
  // so the label survives alongside the delta (the hero has room for a delta or a sub-line only).
  const heroLabel = homeEstimate !== null && homeEstimate > 0 ? HERO_LABEL_WITH_HOME : HERO_LABEL;

  const showsTaxEstimate = cards.includes("tax") && taxCardShowsEstimate(taxData);
  const showsDebtEstimate = cards.includes("debt") && debtCardShowsEstimate(debtData);
  // The sandbox always carries the one projection notice beside its bar (E16 P4.4).
  const showNotice = isSample || showsTaxEstimate || showsDebtEstimate;

  return (
    <PageBody data-testid="dashboard-page" id="dashboard-page">
      {banner}
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
            Choose what shows here
          </Button>
        }
        title={isSample ? "Example figures" : "Your money"}
      />

      {delta ? (
        <HeroFigure
          delta={delta}
          label={heroLabel}
          value={netWorth === null ? null : heroValue(netWorth)}
        />
      ) : (
        <HeroFigure
          emptyAction={
            <Button asChild size="sm" variant="ghost">
              <SampleAwareLink to="/app/accounts">Add an account</SampleAwareLink>
            </Button>
          }
          emptyPrompt="Add an account to see your net worth."
          label={heroLabel}
          value={netWorth === null ? null : heroValue(netWorth)}
        />
      )}

      <DashboardKpiStrip
        budgetKnown={budgetKnown}
        monthlySurplus={budgetKnown ? finiteOrNull(budgetData?.monthlySurplus) : null}
        monthsOfCover={finiteOrNull(budgetData?.monthsOfCover)}
        pensionPot={pensionPot}
        totalOwed={totalOwed}
      />

      {isSample ? null : (
        <div className={housekeepingGroup()}>
          <SetupChecklist {...checklistProps} enabledPages={enabledPages} />
          {checkIn && hasAccounts ? <MonthlyCheckInCard {...checkIn} /> : null}
        </div>
      )}

      <section aria-labelledby="dashboard-sections-title" className={sectionsRegion()}>
        <h2 className={sectionHeading()} id="dashboard-sections-title">
          Your sections
        </h2>
        {cards.length === 0 ? (
          <DashboardEmptyState
            reason={anyShown ? "setup" : "hidden"}
            onChooseWidgets={() => setPanelOpen(true)}
          />
        ) : (
          <div className={widgetGrid()}>
            {cards.map((key) => {
              switch (key) {
                case "accounts":
                  return <AccountsWidget data={accountsData} key="accounts" />;
                case "budget":
                  return <BudgetWidget data={budgetData} key="budget" />;
                case "debt":
                  return <DebtWidget data={debtData} key="debt" />;
                case "savings":
                  return <SavingsWidget data={savingsData} key="savings" />;
                case "pension":
                  return (
                    <PensionWidget
                      data={pensionData}
                      key="pension"
                      potInStrip={!stripShowsDebt(totalOwed)}
                    />
                  );
                case "mortgage":
                  return <MortgageWidget data={mortgageData} key="mortgage" />;
                case "tax":
                  return <TaxWidget data={taxData} key="tax" />;
                default:
                  return null;
              }
            })}
          </div>
        )}
        {showNotice ? (
          <ProjectionNotice
            lead={showsTaxEstimate ? DELTA_PANEL_COPY.unverifiedBanner : undefined}
          />
        ) : null}
      </section>

      {footer}

      <WidgetVisibilityPanel
        error={visibilityError}
        maxVisible={MAX_SECTION_CARDS}
        open={panelOpen}
        visibleKeys={dashboardWidgets}
        widgetKeys={applicableKeys}
        onOpenChange={setPanelOpen}
        onToggle={handleToggleWidget}
      />
    </PageBody>
  );
};
