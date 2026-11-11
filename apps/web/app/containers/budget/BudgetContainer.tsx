import { PortfolioSnapshot } from "@flump/finance-engine";
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
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useUserProfile } from "~/hooks/useUserProfile";
import type { loader } from "~/routes/app.budget";
import { apiFetch } from "~/services/api-client";
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
    const snapshot = new PortfolioSnapshot(accounts, accountDetails);
    return accounts.map((acc: any) => {
      const resolved = snapshot.getAccount(acc.id);
      return {
        ...acc,
        balance: resolved?.nominalBalance ?? (Number(acc.balance) || 0),
      };
    });
  }, [accounts, accountDetails]);

  // Calculate savings balance from accounts (includes Current, Saving, and Investment accounts)
  const savingsBalance = accountsWithBalances
    .filter((a: any) => isSavingsOrInvestment(a.type))
    .reduce((sum: number, acc: any) => sum + Math.max(acc.balance, 0), 0);

  const mortgageBalance = Math.abs(
    accountsWithBalances
      .filter((a: any) => a.type === "Mortgage")
      .reduce((sum: number, acc: any) => sum + (Number(acc.balance) || 0), 0),
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
        accessToken,
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
        accessToken,
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
        accessToken,
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
        accessToken,
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
        accessToken,
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

  const primaryTabStyle = (active: boolean) =>
    css({
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 18px",
      minHeight: "38px",
      fontSize: "sm",
      fontWeight: active ? "semibold" : "medium",
      borderRadius: "lg",
      cursor: "pointer",
      transition: "all 0.15s ease",
      color: active ? "text.primary" : "text.muted",
      backgroundColor: active ? "surface" : "transparent",
      boxShadow: active ? "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)" : "none",
      border: "1px solid",
      borderColor: active ? "border.subtle" : "transparent",
      "&:hover": {
        color: "text.primary",
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
          marginTop: "16px",
          marginBottom: "8px",
          flexWrap: "wrap",
          gap: "16px",
        })}
      >
        <div>
          <FLPHeading as="h1" color="text.primary" size="2xl">
            Budget planner
          </FLPHeading>
          <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
            Track income, expenses and plan your financial runway.
          </FLPText>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <FLPButton
            id="setup-wizard-btn"
            data-testid="setup-wizard-btn"
            size="md"
            variant="primary"
            onClick={() => setActiveTab("wizard")}
          >
            <FaRocket size={13} style={{ marginRight: "6px" }} /> Create budget
          </FLPButton>
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          className={css({
            padding: "12px 16px",
            borderRadius: "12px",
            fontSize: "sm",
            backgroundColor: "status.danger.bg",
            color: "status.danger.text",
            border: "1px solid",
            borderColor: "status.danger.border",
          })}
        >
          {actionError}
        </div>
      )}

      {/* Unified Primary & Category Navigation Bar */}
      {activeTab !== "wizard" && (
        <div
          className={css({
            display: "flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: "card",
            padding: "8px 12px",
            borderRadius: "xl",
            border: "1px solid",
            borderColor: "border",
            boxShadow: "xs",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            maxWidth: "100%",
          })}
        >
          {/* Primary View Switchers */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            <button
              id="budget-tab-overview"
              data-testid="budget-tab-overview"
              className={primaryTabStyle(activeTab === "dashboard")}
              type="button"
              onClick={() => setActiveTab("dashboard")}
            >
              <FaChartBar size={13} /> Overview
            </button>
            <button
              id="budget-tab-runway"
              data-testid="budget-tab-runway"
              className={primaryTabStyle(activeTab === "runway")}
              type="button"
              onClick={handleOpenRunway}
            >
              <FaBalanceScale size={13} /> Runway analysis
            </button>
          </div>

          {/* Vertical Separator */}
          <div
            style={{
              width: "1px",
              height: "22px",
              backgroundColor: "var(--colors-border)",
              flexShrink: 0,
              margin: "0 4px",
            }}
          />

          {/* Category Ledgers Strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexShrink: 0,
            }}
          >
            {categoryTabs.map((cat) => (
              <button
                key={cat}
                id={`budget-tab-${cat}`}
                data-testid={`budget-tab-${cat}`}
                className={categoryPillStyle(activeTab === cat)}
                type="button"
                onClick={() => setActiveTab(cat as BudgetTab)}
              >
                <span style={{ fontSize: "13px" }}>{CATEGORY_ICONS[cat]}</span>
                {CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
            <button
              id="add-category-btn"
              data-testid="add-category-btn"
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

      {activeTab === "dashboard" &&
        (isBudgetEmpty ? (
          <FLPCard
            className={css({
              padding: { base: "32px 20px", md: "48px 32px" },
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "16px",
              backgroundColor: "surface",
              borderWidth: "1px",
              borderStyle: "dashed",
              borderColor: "border.subtle",
              borderRadius: "xl",
            })}
          >
            <div
              className={css({
                width: "56px",
                height: "56px",
                borderRadius: "full",
                backgroundColor: "rgba(99, 99, 241, 0.1)",
                color: "primary",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
              })}
            >
              <FaRocket />
            </div>
            <div>
              <FLPHeading as="h2" size="md">
                No budget created yet
              </FLPHeading>
              <FLPText
                color="text.muted"
                fontSize="sm"
                style={{ maxWidth: "480px", margin: "6px auto 0" }}
              >
                Build your monthly budget to track living expenses, calculate your runway, and
                direct surplus income into savings or debt clearance.
              </FLPText>
            </div>
            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                justifyContent: "center",
                marginTop: "8px",
              }}
            >
              <FLPButton size="md" variant="primary" onClick={() => setActiveTab("wizard")}>
                <FaRocket size={13} style={{ marginRight: "6px" }} /> Create budget
              </FLPButton>
              <FLPButton
                id="add-suggested-defaults-btn"
                data-testid="add-suggested-defaults-btn"
                disabled={isSeedingDefaults}
                size="md"
                variant="outline"
                onClick={handleAddSuggestedDefaults}
              >
                {isSeedingDefaults ? "Adding..." : "Add suggested defaults"}
              </FLPButton>
            </div>
          </FLPCard>
        ) : (
          <BudgetDashboard
            accounts={accountsWithBalances}
            accountDetails={normalizedAccountDetails}
            customCategories={customCategories}
            entries={entries}
            mortgageBalance={mortgageBalance}
            runwaySettings={runwaySettings}
            savingsBalance={savingsBalance}
            onAddSuggestedDefaults={handleAddSuggestedDefaults}
            onNavigateToCategory={(cat) => setActiveTab(cat as BudgetTab)}
            onNavigateToRunway={handleOpenRunway}
          />
        ))}

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
