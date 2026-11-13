import { PortfolioSnapshot } from "@flump/finance-engine";
import { Button, EmptyState, Icon, Illustration, PageHeader, ProjectionNotice } from "@repo/ui";
import { ListChecks } from "lucide-react";
import { type FC, useEffect, useMemo, useState } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { AddCategoryModal } from "~/features/budget/components/AddCategoryModal";
import { BudgetCategoryTable } from "~/features/budget/components/BudgetCategoryTable";
import { BudgetNav } from "~/features/budget/components/BudgetNav";
import { BudgetOverview } from "~/features/budget/components/BudgetOverview";
import { BudgetSetupWizard } from "~/features/budget/components/BudgetSetupWizard";
import { RunwayCalculator } from "~/features/budget/components/RunwayCalculator";
import { useUserProfile } from "~/hooks/useUserProfile";
import type { loader } from "~/routes/app.budget";
import { apiFetch } from "~/services/api-client";
import type { BudgetEntry } from "~/types/budget";
import { buildWorkspacePicture } from "~/utils/financialPicture";
import { clearRunwaySettings, type RunwayScenario } from "~/utils/runwayStorage";
import { errorBanner, pageActions, pageRoot, tabContent } from "./BudgetContainer.styles";

type BudgetTab =
  | "dashboard"
  | "wizard"
  | "housing"
  | "bills"
  | "expenses"
  | "savings"
  | "income"
  | "runway"
  | string;

const STANDARD_CATEGORIES: string[] = ["housing", "bills", "expenses", "savings", "income"];

const BudgetContainer: FC = () => {
  const {
    accounts = [],
    accountDetails = [],
    budgetEntries = [],
    userProfile,
  } = useLoaderData<typeof loader>();

  const navigate = useNavigate();
  const { profile, setProfile, updateProfile, markChecklistStep } = useUserProfile();

  // Sync profile from loader into atom
  useEffect(() => {
    if (userProfile) setProfile(userProfile);
  }, [userProfile, setProfile]);

  const [activeTab, setActiveTab] = useState<BudgetTab>("dashboard");
  const [entries, setEntries] = useState<BudgetEntry[]>(budgetEntries);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isSeedingDefaults, setIsSeedingDefaults] = useState(false);

  // Custom categories initialized from profile + any non-standard categories in entries
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const fromProfile = userProfile?.customBudgetCategories || [];
    const fromEntries = budgetEntries
      .map((e) => e.category)
      .filter((c) => !STANDARD_CATEGORIES.includes(c));
    return Array.from(new Set([...fromProfile, ...fromEntries]));
  });

  useEffect(() => {
    if (userProfile?.customBudgetCategories && userProfile.customBudgetCategories.length > 0) {
      setCustomCategories((prev) => {
        const next = Array.from(new Set([...prev, ...(userProfile.customBudgetCategories || [])]));
        if (next.length === prev.length && next.every((val, index) => val === prev[index])) {
          return prev;
        }
        return next;
      });
    }
  }, [userProfile?.customBudgetCategories]);

  const categoryTabs = useMemo(() => {
    return [...STANDARD_CATEGORIES, ...customCategories];
  }, [customCategories]);

  // Months-of-cover scenario inputs (accounts counted, severance, cuts, dropped lines) are
  // session-only: held here so they survive tab switches, cleared on reload, never saved and
  // never read by a headline.
  const [runwayScenario, setRunwayScenario] = useState<RunwayScenario | null>(null);

  // Older versions saved an account preference in the browser; it no longer feeds any figure.
  useEffect(() => {
    clearRunwaySettings();
  }, []);

  // Normalize accountDetails to support both snake_case and camelCase
  const normalizedAccountDetails = useMemo(() => {
    return accountDetails.map((d: any) => ({
      ...d,
      account_id: d.account_id || d.accountId,
      month: Number(d.month) || 0,
      year: Number(d.year) || 0,
      value: Number(d.value ?? d.balance ?? 0),
    }));
  }, [accountDetails]);

  // Sync current balance for all accounts from latest accountDetails or direct balance
  const accountsWithBalances = useMemo(() => {
    const snapshot = new PortfolioSnapshot(accounts, accountDetails);
    return accounts.map((acc: any) => {
      const resolved = snapshot.getAccount(acc.id);
      return {
        ...acc,
        balance: resolved?.nominalBalance ?? (Number(acc.balance) || 0),
      };
    });
  }, [accounts, accountDetails]);

  // The same engine builder the loaders use, run on the live entries so an edit updates every
  // figure on this page at once (E23 section 2).
  const picture = useMemo(
    () => buildWorkspacePicture({ userProfile, accounts, accountDetails, budgetEntries: entries }),
    [userProfile, accounts, accountDetails, entries],
  );

  const isBudgetEmpty = useMemo(() => {
    if (entries.length === 0) return true;
    const total = entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    return total === 0;
  }, [entries]);

  const [actionError, setActionError] = useState<string | null>(null);

  const addEntry = async (
    entry: Omit<BudgetEntry, "id" | "userId" | "createdAt" | "updatedAt">,
  ) => {
    try {
      const created = await apiFetch<BudgetEntry>("/budget-entries", {
        method: "POST",
        body: entry,
      });
      setActionError(null);
      setEntries((prev) => [...prev, created]);
    } catch (err) {
      setActionError("We couldn't add that entry. Please try again.");
      throw err;
    }
  };

  const updateEntry = async (id: string, update: Partial<BudgetEntry>) => {
    try {
      const updated = await apiFetch<BudgetEntry>(`/budget-entries/${id}`, {
        method: "PATCH",
        body: update,
      });
      setActionError(null);
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    } catch (err) {
      setActionError("We couldn't save your changes. Please try again.");
      throw err;
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      await apiFetch<void>(`/budget-entries/${id}`, {
        method: "DELETE",
        allowEmpty: true,
      });
    } catch {
      // Keep the row: the server still has it.
      setActionError("We couldn't delete that entry. Please try again.");
      return;
    }
    setActionError(null);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleWizardComplete = async () => {
    await markChecklistStep("budget", true);
    setActiveTab("dashboard");
  };

  const handleOpenRunway = () => {
    setActiveTab("runway");
    markChecklistStep("runway", true).catch(() => {});
  };

  const handleAddSuggestedDefaults = async () => {
    setIsSeedingDefaults(true);
    try {
      const updated = await apiFetch<BudgetEntry[]>("/budget-entries/seed-defaults", {
        method: "POST",
        body: {},
      });
      setActionError(null);
      setEntries(updated);
    } catch {
      setActionError("We couldn't add the suggested defaults. Please try again.");
    } finally {
      setIsSeedingDefaults(false);
    }
  };

  const handleAddCategory = async (catName: string) => {
    const trimmed = catName.trim().toLowerCase();
    if (!trimmed) return;

    let updatedCategories = Array.from(new Set([...customCategories, trimmed]));
    try {
      const data = await apiFetch<{ categories?: string[] }>("/budget-entries/categories", {
        method: "POST",
        body: { category: trimmed },
      });
      updatedCategories = data?.categories || updatedCategories;
    } catch (err) {
      console.error("Error creating category:", err);
    }
    setCustomCategories(updatedCategories);
    try {
      await updateProfile({ customBudgetCategories: updatedCategories });
      setActionError(null);
    } catch {
      setActionError("We couldn't save your new category. Please try again.");
    }
    setActiveTab(trimmed);
  };

  const handleDeleteCategory = async (catToDelete: string) => {
    const updated = customCategories.filter((c) => c !== catToDelete);
    setCustomCategories(updated);
    await updateProfile({ customBudgetCategories: updated });
    if (activeTab === catToDelete) {
      setActiveTab("dashboard");
    }
  };

  return (
    <div className={pageRoot()}>
      <ProjectionNotice />
      <PageHeader
        actions={
          <div className={pageActions()}>
            <Button
              data-testid="setup-wizard-btn"
              id="setup-wizard-btn"
              onClick={() => setActiveTab("wizard")}
            >
              <Icon icon={ListChecks} size="sm" />
              Create budget
            </Button>
          </div>
        }
        subtitle="Your income, spending and how long your money lasts."
        title="Your budget"
      />

      {actionError && (
        <div role="alert" className={errorBanner()}>
          {actionError}
        </div>
      )}

      {activeTab !== "wizard" && (
        <BudgetNav
          activeTab={activeTab}
          categoryTabs={categoryTabs}
          onAddCategory={() => setIsAddCategoryOpen(true)}
          onOpenRunway={handleOpenRunway}
          onSelectTab={(tab) => setActiveTab(tab as BudgetTab)}
        />
      )}

      {activeTab === "wizard" && (
        <BudgetSetupWizard
          entries={entries}
          monthlyTakeHome={userProfile?.monthlyTakeHome ?? null}
          onAddEntry={addEntry}
          onDeleteEntry={deleteEntry}
          onCancel={() => setActiveTab("dashboard")}
          onComplete={handleWizardComplete}
          onUpdateEntry={updateEntry}
        />
      )}

      {activeTab === "dashboard" &&
        (isBudgetEmpty ? (
          <EmptyState
            action={
              <Button onClick={() => setActiveTab("wizard")}>
                <Icon icon={ListChecks} size="sm" />
                Create budget
              </Button>
            }
            description="Add your income and what you spend each month to see what is left over and how long your money lasts."
            illustration={<Illustration scene="onboarding" />}
            secondaryAction={
              <Button
                data-testid="add-suggested-defaults-btn"
                disabled={isSeedingDefaults}
                id="add-suggested-defaults-btn"
                variant="outline"
                onClick={handleAddSuggestedDefaults}
              >
                {isSeedingDefaults ? "Adding" : "Add suggested defaults"}
              </Button>
            }
            title="No budget yet"
          />
        ) : (
          <BudgetOverview
            customCategories={customCategories}
            entries={entries}
            picture={picture}
            onNavigateToCategory={(cat) => setActiveTab(cat as BudgetTab)}
            onNavigateToRunway={handleOpenRunway}
          />
        ))}

      {categoryTabs.includes(activeTab) && (
        <div className={tabContent()}>
          <BudgetCategoryTable
            category={activeTab}
            entries={entries.filter((e) => e.category === activeTab)}
            onAdd={addEntry}
            onDelete={deleteEntry}
            onUpdate={updateEntry}
            onDeleteCategory={
              !STANDARD_CATEGORIES.includes(activeTab) ? handleDeleteCategory : undefined
            }
          />
        </div>
      )}

      {activeTab === "runway" && (
        <RunwayCalculator
          accountDetails={normalizedAccountDetails}
          accounts={accountsWithBalances}
          baseline={picture.monthsOfCover}
          entries={entries}
          scenario={runwayScenario}
          onScenarioChange={setRunwayScenario}
          onNavigateToForecast={() => navigate("/app/savings#forecast")}
        />
      )}

      <AddCategoryModal
        open={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        onAddCategory={handleAddCategory}
        existingCategories={categoryTabs}
      />
    </div>
  );
};

export default BudgetContainer;
