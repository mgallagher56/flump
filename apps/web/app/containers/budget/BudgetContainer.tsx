import { css } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useMemo, useState } from "react";
import { FaBalanceScale, FaChartBar, FaPlus, FaRocket } from "react-icons/fa";
import { useLoaderData, useNavigate } from "react-router";
import AddCategoryModal from "~/components/budget/AddCategoryModal";
import BudgetCategoryTable from "~/components/budget/BudgetCategoryTable";
import BudgetDashboard from "~/components/budget/BudgetDashboard";
import BudgetSetupWizard from "~/components/budget/BudgetSetupWizard";
import RunwayCalculator from "~/components/budget/RunwayCalculator";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useUserProfile } from "~/hooks/useUserProfile";
import type { loader } from "~/routes/app.budget";
import type { BudgetEntry } from "~/types/budget";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "~/types/budget";
import {
  loadRunwaySettings,
  type RunwaySavedSettings,
  saveRunwaySettings,
} from "~/utils/runwayStorage";

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
    accessToken,
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

  const [runwaySettings, setRunwaySettings] = useState<RunwaySavedSettings | null>(() =>
    loadRunwaySettings(),
  );

  const handleUpdateRunwaySettings = (updated: RunwaySavedSettings) => {
    setRunwaySettings(updated);
    saveRunwaySettings(updated);
  };

  const isSavingsOrInvestment = (type?: string) => {
    if (!type) return false;
    const t = type.toLowerCase().trim();
    return (
      t === "current" ||
      t === "saving" ||
      t === "savings" ||
      t === "investment" ||
      t === "investments"
    );
  };

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
    return accounts.map((acc: any) => {
      const details = normalizedAccountDetails
        .filter((d: any) => d.account_id === acc.id)
        .sort((a: any, b: any) => (a.year !== b.year ? b.year - a.year : b.month - a.month));

      let bal = Number(acc.balance ?? acc.value);
      if (details.length > 0) {
        const detailVal = Number(details[0].value);
        if (Number.isFinite(detailVal) && (detailVal > 0 || !Number.isFinite(bal) || bal === 0)) {
          bal = detailVal;
        }
      }
      return {
        ...acc,
        balance: Number.isFinite(bal) ? bal : 0,
      };
    });
  }, [accounts, normalizedAccountDetails]);

  // Calculate savings balance from accounts (includes Current, Saving, and Investment accounts)
  const savingsBalance = accountsWithBalances
    .filter((a: any) => isSavingsOrInvestment(a.type))
    .reduce((sum: number, acc: any) => sum + Math.max(acc.balance, 0), 0);

  const mortgageBalance = Math.abs(
    accountsWithBalances
      .filter((a: any) => a.type === "Mortgage")
      .reduce((sum: number, acc: any) => sum + (Number(acc.balance) || 0), 0),
  );

  const apiUrl =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) ??
    (window as Window & { ENV?: { VITE_API_URL?: string } }).ENV?.VITE_API_URL ??
    "http://localhost:4000";
  const authHeader = { Authorization: `Bearer ${accessToken || "mock-session-token"}` };

  const addEntry = async (
    entry: Omit<BudgetEntry, "id" | "userId" | "createdAt" | "updatedAt">,
  ) => {
    const res = await fetch(`${apiUrl}/budget-entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error("Failed to add entry");
    const created = (await res.json()) as BudgetEntry;
    setEntries((prev) => [...prev, created]);
  };

  const updateEntry = async (id: string, update: Partial<BudgetEntry>) => {
    const res = await fetch(`${apiUrl}/budget-entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify(update),
    });
    if (!res.ok) throw new Error("Failed to update entry");
    const updated = (await res.json()) as BudgetEntry;
    setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
  };

  const deleteEntry = async (id: string) => {
    await fetch(`${apiUrl}/budget-entries/${id}`, {
      method: "DELETE",
      headers: authHeader,
    });
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
      const res = await fetch(`${apiUrl}/budget-entries/seed-defaults`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
      });
      if (!res.ok) throw new Error("Failed to add suggested defaults");
      const updated = (await res.json()) as BudgetEntry[];
      setEntries(updated);
    } catch (err) {
      console.error("Error adding suggested defaults:", err);
    } finally {
      setIsSeedingDefaults(false);
    }
  };

  const handleAddCategory = async (catName: string) => {
    const trimmed = catName.trim().toLowerCase();
    if (!trimmed) return;

    try {
      const res = await fetch(`${apiUrl}/budget-entries/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ category: trimmed }),
      });
      let updatedCategories: string[];
      if (res.ok) {
        const data = await res.json();
        updatedCategories = data.categories || Array.from(new Set([...customCategories, trimmed]));
      } else {
        updatedCategories = Array.from(new Set([...customCategories, trimmed]));
      }
      setCustomCategories(updatedCategories);
      await updateProfile({ customBudgetCategories: updatedCategories });
      setActiveTab(trimmed);
    } catch (err) {
      console.error("Error creating category:", err);
      const updatedCategories = Array.from(new Set([...customCategories, trimmed]));
      setCustomCategories(updatedCategories);
      await updateProfile({ customBudgetCategories: updatedCategories });
      setActiveTab(trimmed);
    }
  };

  const handleDeleteCategory = async (catToDelete: string) => {
    const updated = customCategories.filter((c) => c !== catToDelete);
    setCustomCategories(updated);
    await updateProfile({ customBudgetCategories: updated });
    if (activeTab === catToDelete) {
      setActiveTab("dashboard");
    }
  };

  const primaryTabStyle = (active: boolean) =>
    css({
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 16px",
      fontSize: "sm",
      fontWeight: "semibold",
      borderRadius: "md",
      cursor: "pointer",
      transition: "all 0.15s ease",
      color: active ? "primary" : "text.secondary",
      backgroundColor: active ? "card" : "transparent",
      boxShadow: active ? "xs" : "none",
      border: "1px solid",
      borderColor: active ? "border" : "transparent",
      "&:hover": {
        color: "primary",
        backgroundColor: active ? "card" : "rgba(99, 99, 241, 0.05)",
      },
    });

  const categoryPillStyle = (active: boolean) =>
    css({
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px 12px",
      fontSize: "xs",
      fontWeight: active ? "bold" : "medium",
      borderRadius: "full",
      cursor: "pointer",
      whiteSpace: "nowrap",
      transition: "all 0.15s ease",
      color: active ? "primary" : "text.secondary",
      backgroundColor: active ? "rgba(99, 99, 241, 0.1)" : "surface.subtle",
      border: "1px solid",
      borderColor: active ? "primary" : "border",
      "&:hover": {
        borderColor: "primary",
        color: "primary",
      },
    });

  return (
    <div
      className={css({
        paddingBottom: "48px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      })}
    >
      {/* Page header */}
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          my: 4,
          flexWrap: "wrap",
          gap: "16px",
        })}
      >
        <div>
          <FLPHeading as="h1" color="text.primary" size="xl">
            Budget Planner
          </FLPHeading>
          <FLPText color="text.muted" fontSize="sm">
            Track income, expenses, and plan your financial runway.
          </FLPText>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <FLPButton
            id="add-category-btn"
            data-testid="add-category-btn"
            size="sm"
            variant="outline"
            onClick={() => setIsAddCategoryOpen(true)}
          >
            <FaPlus size={11} style={{ marginRight: "6px" }} /> Add Category
          </FLPButton>
          <FLPButton
            id="add-suggested-defaults-btn"
            data-testid="add-suggested-defaults-btn"
            size="sm"
            variant="outline"
            disabled={isSeedingDefaults}
            onClick={handleAddSuggestedDefaults}
          >
            <FaPlus size={11} style={{ marginRight: "6px" }} />
            {isSeedingDefaults ? "Adding..." : "Add Suggested Defaults"}
          </FLPButton>
          <button
            id="setup-wizard-btn"
            data-testid="setup-wizard-btn"
            className={css({
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              fontSize: "sm",
              fontWeight: "semibold",
              color: activeTab === "wizard" ? "primary" : "text.secondary",
              borderRadius: "md",
              border: "1px solid",
              borderColor: activeTab === "wizard" ? "primary" : "border",
              backgroundColor: activeTab === "wizard" ? "rgba(99,99,241,0.08)" : "card",
              cursor: "pointer",
              transition: "all 0.2s",
              "&:hover": {
                borderColor: "primary",
                color: "primary",
              },
            })}
            type="button"
            onClick={() => setActiveTab("wizard")}
          >
            <FaRocket size={13} /> Setup Wizard
          </button>
        </div>
      </div>

      {/* Primary & Category Navigation */}
      {activeTab !== "wizard" && (
        <div
          className={css({
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            backgroundColor: "card",
            padding: "12px 16px",
            borderRadius: "xl",
            border: "1px solid",
            borderColor: "border",
            boxShadow: "xs",
          })}
        >
          {/* Level 1: Primary View Switcher */}
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "surface.subtle",
              padding: "4px",
              borderRadius: "lg",
              width: "fit-content",
            })}
          >
            <button
              id="budget-tab-overview"
              data-testid="budget-tab-overview"
              className={primaryTabStyle(activeTab === "dashboard")}
              type="button"
              onClick={() => setActiveTab("dashboard")}
            >
              <FaChartBar size={14} /> Overview
            </button>
            <button
              id="budget-tab-runway"
              data-testid="budget-tab-runway"
              className={primaryTabStyle(activeTab === "runway")}
              type="button"
              onClick={handleOpenRunway}
            >
              <FaBalanceScale size={14} /> Runway Analysis
            </button>
          </div>

          {/* Level 2: Category Ledgers Strip */}
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              gap: "8px",
              overflowX: "auto",
              paddingTop: "6px",
              borderTop: "1px solid",
              borderColor: "border",
            })}
          >
            <span
              className={css({
                fontSize: "xs",
                fontWeight: "semibold",
                color: "text.muted",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginRight: "4px",
                whiteSpace: "nowrap",
              })}
            >
              Categories:
            </span>
            {categoryTabs.map((cat) => (
              <button
                key={cat}
                id={`budget-tab-${cat}`}
                data-testid={`budget-tab-${cat}`}
                className={categoryPillStyle(activeTab === cat)}
                type="button"
                onClick={() => setActiveTab(cat as BudgetTab)}
              >
                <span style={{ fontSize: "14px" }}>{CATEGORY_ICONS[cat]}</span>
                {CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
            <button
              id="add-category-tab-btn"
              data-testid="add-category-tab-btn"
              className={css({
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "5px 10px",
                fontSize: "xs",
                fontWeight: "semibold",
                color: "primary",
                cursor: "pointer",
                whiteSpace: "nowrap",
                background: "none",
                border: "1px dashed",
                borderColor: "primary",
                borderRadius: "full",
                transition: "all 0.15s ease",
                _hover: { backgroundColor: "rgba(99,99,241,0.08)" },
              })}
              type="button"
              onClick={() => setIsAddCategoryOpen(true)}
            >
              <FaPlus size={10} /> Add
            </button>
          </div>
        </div>
      )}

      {/* Content */}
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

      {activeTab === "dashboard" && (
        <BudgetDashboard
          accounts={accountsWithBalances}
          accountDetails={normalizedAccountDetails}
          entries={entries}
          mortgageBalance={mortgageBalance}
          savingsBalance={savingsBalance}
          runwaySettings={runwaySettings}
          customCategories={customCategories}
          onAddSuggestedDefaults={handleAddSuggestedDefaults}
          onNavigateToCategory={(cat) => setActiveTab(cat as BudgetTab)}
          onNavigateToRunway={handleOpenRunway}
        />
      )}

      {categoryTabs.includes(activeTab) && (
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
      )}

      {activeTab === "runway" && (
        <RunwayCalculator
          accountDetails={normalizedAccountDetails}
          accounts={accountsWithBalances}
          entries={entries}
          savedSettings={runwaySettings}
          onSaveSettings={handleUpdateRunwaySettings}
          onNavigateToForecast={() => navigate("/app/forecast")}
        />
      )}

      {/* Add Category Dialog */}
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
