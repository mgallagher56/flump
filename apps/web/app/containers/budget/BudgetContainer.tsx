import { css } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useState } from "react";
import { FaBalanceScale, FaChartBar, FaRocket } from "react-icons/fa";
import { useLoaderData, useNavigate } from "react-router";
import BudgetCategoryTable from "~/components/budget/BudgetCategoryTable";
import BudgetDashboard from "~/components/budget/BudgetDashboard";
import BudgetSetupWizard from "~/components/budget/BudgetSetupWizard";
import RunwayCalculator from "~/components/budget/RunwayCalculator";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useUserProfile } from "~/hooks/useUserProfile";
import type { loader } from "~/routes/app.budget";
import type { BudgetCategory, BudgetEntry } from "~/types/budget";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "~/types/budget";

type BudgetTab =
  | "dashboard"
  | "wizard"
  | "housing"
  | "bills"
  | "expenses"
  | "savings"
  | "income"
  | "runway";

const CATEGORY_TABS: BudgetCategory[] = ["housing", "bills", "expenses", "savings", "income"];

const BudgetContainer: FC = () => {
  const {
    accounts = [],
    accountDetails = [],
    budgetEntries = [],
    userProfile,
  } = useLoaderData<typeof loader>();

  const navigate = useNavigate();
  const { setProfile, markChecklistStep } = useUserProfile();

  // Sync profile from loader into atom
  useEffect(() => {
    if (userProfile) setProfile(userProfile);
  }, [userProfile, setProfile]);

  const [activeTab, setActiveTab] = useState<BudgetTab>("dashboard");
  const [entries, setEntries] = useState<BudgetEntry[]>(budgetEntries);

  // Calculate savings balance from accounts
  const savingsBalance = accounts
    .filter((a: { type: string }) => ["Current", "Saving"].includes(a.type))
    .reduce((sum: number, acc: { id: string; balance: number }) => {
      const details = accountDetails
        .filter((d: { account_id: string }) => d.account_id === acc.id)
        .sort((a: { year: number; month: number }, b: { year: number; month: number }) =>
          a.year !== b.year ? b.year - a.year : b.month - a.month,
        );
      const bal = details.length > 0 ? details[0].value : acc.balance;
      return sum + (bal > 0 ? bal : 0);
    }, 0);

  const mortgageBalance = Math.abs(
    accounts
      .filter((a: { type: string }) => a.type === "Mortgage")
      .reduce((sum: number, acc: { balance: number }) => sum + (acc.balance || 0), 0),
  );

  const apiUrl =
    (window as Window & { ENV?: { VITE_API_URL?: string } }).ENV?.VITE_API_URL ??
    "http://localhost:4000";
  const authHeader = { Authorization: "Bearer mock-session-token" };

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

  const tabStyle = (active: boolean) =>
    css({
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "8px 14px",
      fontSize: "sm",
      fontWeight: "semibold",
      color: active ? "primary" : "text.muted",
      cursor: "pointer",
      marginBottom: "-10px",
      transition: "all 0.2s",
      whiteSpace: "nowrap",
      "&:hover": { color: "primary" },
      background: "none",
      border: "none",
      borderBottom: active ? "2px solid var(--colors-primary)" : "2px solid transparent",
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
          my: 6,
          flexWrap: "wrap",
          gap: "16px",
        })}
      >
        <div>
          <FLPHeading as="h1" color="blue.500" size="xl">
            Budget Planner
          </FLPHeading>
          <FLPText color="text.muted" fontSize="sm">
            Track income, expenses, and plan your financial runway.
          </FLPText>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className={css({
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              fontSize: "sm",
              fontWeight: "semibold",
              color: activeTab === "wizard" ? "primary" : "text.muted",
              borderRadius: "md",
              border: "1px solid",
              borderColor: activeTab === "wizard" ? "primary" : "border",
              backgroundColor: activeTab === "wizard" ? "rgba(99,99,241,0.08)" : "surface",
              cursor: "pointer",
              transition: "all 0.2s",
            })}
            type="button"
            onClick={() => setActiveTab("wizard")}
          >
            <FaRocket size={13} /> Setup Wizard
          </button>
        </div>
      </div>

      {/* Tab bar */}
      {activeTab !== "wizard" && (
        <div
          className={css({
            display: "flex",
            gap: "4px",
            borderBottom: "1px solid",
            borderColor: "border",
            paddingBottom: "8px",
            overflowX: "auto",
          })}
        >
          <button
            className={tabStyle(activeTab === "dashboard")}
            type="button"
            onClick={() => setActiveTab("dashboard")}
          >
            <FaChartBar size={13} /> Overview
          </button>
          {CATEGORY_TABS.map((cat) => (
            <button
              key={cat}
              className={tabStyle(activeTab === cat)}
              type="button"
              onClick={() => setActiveTab(cat)}
            >
              <span style={{ fontSize: "14px" }}>{CATEGORY_ICONS[cat]}</span>
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
          <button
            className={tabStyle(activeTab === "runway")}
            type="button"
            onClick={() => setActiveTab("runway")}
          >
            <FaBalanceScale size={13} /> Runway
          </button>
        </div>
      )}

      {/* Content */}
      {activeTab === "wizard" && (
        <BudgetSetupWizard
          entries={entries}
          monthlyTakeHome={userProfile?.monthlyTakeHome ?? null}
          onAddEntry={addEntry}
          onCancel={() => setActiveTab("dashboard")}
          onComplete={handleWizardComplete}
          onUpdateEntry={updateEntry}
        />
      )}

      {activeTab === "dashboard" && (
        <BudgetDashboard
          accounts={accounts}
          accountDetails={accountDetails}
          entries={entries}
          mortgageBalance={mortgageBalance}
          savingsBalance={savingsBalance}
          onNavigateToCategory={(cat) => setActiveTab(cat)}
          onNavigateToRunway={() => setActiveTab("runway")}
        />
      )}

      {CATEGORY_TABS.includes(activeTab as BudgetCategory) && (
        <BudgetCategoryTable
          category={activeTab as BudgetCategory}
          entries={entries.filter((e) => e.category === activeTab)}
          onAdd={addEntry}
          onDelete={deleteEntry}
          onUpdate={updateEntry}
        />
      )}

      {activeTab === "runway" && (
        <RunwayCalculator
          accountDetails={accountDetails.map(
            (d: { account_id: string; month: number; year: number; value: number }) => ({
              account_id: d.account_id,
              month: d.month,
              year: d.year,
              value: d.value,
            }),
          )}
          accounts={accounts}
          entries={entries}
          onNavigateToForecast={() => navigate("/app/forecast")}
        />
      )}
    </div>
  );
};

export default BudgetContainer;
