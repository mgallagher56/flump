import {
  AddBudgetCategoryResponse,
  BudgetEntryListResponse,
  BudgetEntryResponse,
  DeleteBudgetEntryResponse,
  etagFor,
} from "@flump/api-contract";
import { PortfolioSnapshot } from "@flump/finance-engine";
import {
  Button,
  DataList,
  EmptyState,
  Icon,
  Illustration,
  InlineAlert,
  PageBody,
  PageHeader,
} from "@repo/ui";
import { ListChecks, Pencil } from "lucide-react";
import { type FC, useEffect, useMemo, useRef, useState } from "react";
import { useLoaderData } from "react-router";
import { AddCategoryModal } from "~/features/budget/components/AddCategoryModal";
import { BudgetCategoryList } from "~/features/budget/components/BudgetCategoryList";
import { BudgetEditor } from "~/features/budget/components/BudgetEditor";
import { BudgetOverview } from "~/features/budget/components/BudgetOverview";
import { BudgetSetupWizard } from "~/features/budget/components/BudgetSetupWizard";
import { RunwayCalculator } from "~/features/budget/components/RunwayCalculator";
import { DebtHelpLink } from "~/features/debt/components/DebtHelpLink";
import {
  HousingDetails,
  type HousingTenure,
  housingTenureLabel,
} from "~/features/housing/components/HousingDetails";
import { useUserProfile } from "~/hooks/useUserProfile";
import type { loader } from "~/routes/app.budget";
import { apiFetch, apiFetchAll } from "~/services/api-client";
import { BackendError } from "~/services/backend-error";
import { type BudgetEntry, getCategoryLabel, toMonthly } from "~/types/budget";
import { buildWorkspacePicture } from "~/utils/financialPicture";
import { clearRunwaySettings, type RunwayScenario } from "~/utils/runwayStorage";

/**
 * The page shows the budget, the budget with its entries editable in place (E16 round 3), or the
 * first-time setup wizard in its place.
 */
type BudgetView = "budget" | "editing" | "wizard";

const STANDARD_CATEGORIES: string[] = ["housing", "bills", "expenses", "savings", "income"];

/**
 * Leaves out the keys the backend accepts and ignores on budget-entry writes (`isPrimaryIncome`
 * and `isDefault` are server-owned, `contractEndDate` has no column), so they are never sent.
 */
function writableEntryFields<T extends Partial<BudgetEntry>>(entry: T) {
  const {
    isPrimaryIncome: _primary,
    isDefault: _default,
    contractEndDate: _end,
    ...fields
  } = entry;
  return fields;
}

const FREQUENCY_NOTE: Record<string, string> = { annual: "Paid yearly", weekly: "Paid weekly" };

/** "Essential", or "Flexible, paid yearly": the quiet second line of a read-only entry. */
function entrySecondary(entry: BudgetEntry): string {
  const kind = entry.isEssential ? "Essential" : "Flexible";
  const note = FREQUENCY_NOTE[entry.frequency];
  return note ? `${kind}, ${note.toLowerCase()}` : kind;
}

const BudgetContainer: FC = () => {
  const {
    accounts = [],
    accountDetails = [],
    budgetEntries = [],
    userProfile,
  } = useLoaderData<typeof loader>();

  const { profile, setProfile, updateProfile, markChecklistStep } = useUserProfile();

  // Sync profile from loader into atom
  useEffect(() => {
    if (userProfile) setProfile(userProfile);
  }, [userProfile, setProfile]);

  const [view, setView] = useState<BudgetView>("budget");
  // The one category whose entries are open in the list (E16 PR 5: rows open their entries).
  const [openCategory, setOpenCategory] = useState<string | null>(null);
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

  const allCategories = useMemo(() => {
    return [...STANDARD_CATEGORIES, ...customCategories];
  }, [customCategories]);

  // Months-of-cover scenario inputs (accounts counted, severance, cuts, dropped lines) are
  // session-only: held here, cleared on reload, never saved and never read by the hero or strip.
  const [runwayScenario, setRunwayScenario] = useState<RunwayScenario | null>(null);
  const runwayStepMarked = useRef(false);
  const handleScenarioChange = (next: RunwayScenario) => {
    setRunwayScenario(next);
    if (!runwayStepMarked.current) {
      runwayStepMarked.current = true;
      markChecklistStep("runway", true).catch(() => {});
    }
  };

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

  // Housing saved on this page, laid over the loader profile until the next load (E32).
  const [savedHousing, setSavedHousing] = useState<{
    housingStatus: Exclude<HousingTenure, null>;
    monthlyHousingCost: number;
  } | null>(null);
  const pictureProfile = useMemo(
    () => (savedHousing ? { ...(userProfile ?? {}), ...savedHousing } : userProfile),
    [userProfile, savedHousing],
  );

  // The same engine builder the loaders use, run on the live entries so an edit updates every
  // figure on this page at once (E23 section 2).
  const picture = useMemo(
    () =>
      buildWorkspacePicture({
        userProfile: pictureProfile,
        accounts,
        accountDetails,
        budgetEntries: entries,
      }),
    [pictureProfile, accounts, accountDetails, entries],
  );

  // Housing cost shows once: as the housing row in "Where your money goes". The row names the
  // tenure, and opening it says where the saved figure lives (E16 R2-6).
  const housingStatus = (pictureProfile?.housingStatus ?? null) as HousingTenure;

  const handleSaveHousing = async (monthly: number) => {
    // Someone who has not said yet is asked for their rent, as before (E32).
    const update = {
      housingStatus: housingStatus ?? ("renting" as const),
      monthlyHousingCost: monthly,
    };
    await updateProfile(update);
    setSavedHousing(update);
  };

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
      const created = await apiFetch("/budget-entries", {
        method: "POST",
        body: writableEntryFields(entry),
        schema: BudgetEntryResponse,
      });
      setActionError(null);
      setEntries((prev) => [...prev, created]);
    } catch (err) {
      setActionError("We could not add that entry. Nothing has changed. Try again.");
      throw err;
    }
  };

  const updateEntry = async (id: string, update: Partial<BudgetEntry>) => {
    try {
      const current = entries.find((e) => e.id === id);
      const updated = await apiFetch(`/budget-entries/${id}`, {
        method: "PATCH",
        body: writableEntryFields(update),
        schema: BudgetEntryResponse,
        ifMatch: current?.updatedAt ? etagFor(current.updatedAt) : undefined,
      });
      setActionError(null);
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    } catch (err) {
      setActionError("We could not save your changes. Nothing has changed. Try again.");
      // 412: the row changed elsewhere since it was loaded. Reload the rows so the next try sends
      // the current version instead of failing until the page is reloaded.
      if (err instanceof BackendError && err.status === 412) {
        await apiFetchAll("/budget-entries", { schema: BudgetEntryListResponse })
          .then(setEntries)
          .catch(() => undefined);
      }
      throw err;
    }
  };

  /** Resolves `false` when the delete failed and the row was kept. */
  const deleteEntry = async (id: string): Promise<boolean> => {
    try {
      await apiFetch(`/budget-entries/${id}`, {
        method: "DELETE",
        schema: DeleteBudgetEntryResponse,
        allowEmpty: true,
      });
    } catch {
      // Keep the row: the server still has it.
      setActionError("We could not delete that entry. Nothing has changed. Try again.");
      return false;
    }
    setActionError(null);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    return true;
  };

  const handleWizardComplete = async () => {
    await markChecklistStep("budget", true);
    setView("budget");
  };

  const handleAddSuggestedDefaults = async () => {
    setIsSeedingDefaults(true);
    try {
      const updated = await apiFetch("/budget-entries/seed-defaults", {
        method: "POST",
        body: {},
        schema: BudgetEntryListResponse,
      });
      setActionError(null);
      setEntries(updated);
    } catch {
      setActionError("We could not add the example figures. Nothing has changed. Try again.");
    } finally {
      setIsSeedingDefaults(false);
    }
  };

  const handleAddCategory = async (catName: string) => {
    const trimmed = catName.trim().toLowerCase();
    if (!trimmed) return;

    let updatedCategories = Array.from(new Set([...customCategories, trimmed]));
    try {
      const data = await apiFetch("/budget-entries/categories", {
        method: "POST",
        body: { category: trimmed },
        schema: AddBudgetCategoryResponse,
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
      setActionError("We could not save your new category. Nothing has changed. Try again.");
    }
    setOpenCategory(trimmed);
  };

  const handleDeleteCategory = async (catToDelete: string) => {
    const updated = customCategories.filter((c) => c !== catToDelete);
    setCustomCategories(updated);
    await updateProfile({ customBudgetCategories: updated });
    if (openCategory === catToDelete) {
      setOpenCategory(null);
    }
  };

  const renderEntries = (category: string) => (
    <>
      {category === "housing" && (
        <HousingDetails
          housingStatus={housingStatus}
          rowTotal={entries
            .filter((e) => e.category === "housing" && !e.isIncome)
            .reduce((sum, e) => sum + Math.abs(toMonthly(e)), 0)}
          savedAmount={pictureProfile?.monthlyHousingCost ?? null}
          onSave={handleSaveHousing}
        />
      )}
      {/* Read only: entries are edited in place with "Edit budget" (E16 round 3). */}
      <DataList
        items={entries
          .filter((e) => e.category === category && !e.isIncome)
          .map((e) => ({
            id: e.id,
            label: e.name,
            secondary: entrySecondary(e),
            value: Math.abs(toMonthly(e)),
            valueProps: { fractionDigits: 0 },
          }))}
        label={`${getCategoryLabel(category)} entries`}
        noun={{ one: "entry", other: "entries" }}
      />
    </>
  );

  return (
    <PageBody>
      <PageHeader
        actions={
          view === "editing" ? (
            <Button
              data-testid="finish-editing-btn"
              id="finish-editing-btn"
              onClick={() => setView("budget")}
            >
              Finish editing
            </Button>
          ) : view === "budget" ? (
            // The wizard is for first-time setup only; a saved budget is edited in place.
            <Button
              data-testid="setup-wizard-btn"
              id="setup-wizard-btn"
              variant={isBudgetEmpty ? "primary" : "outline"}
              onClick={() => setView(isBudgetEmpty ? "wizard" : "editing")}
            >
              <Icon icon={isBudgetEmpty ? ListChecks : Pencil} size="sm" />
              {isBudgetEmpty ? "Set up your budget" : "Edit budget"}
            </Button>
          ) : undefined
        }
        subtitle="Your income, spending and how long your money lasts."
        title="Your budget"
      />

      {actionError && <InlineAlert tone="danger">{actionError}</InlineAlert>}

      {view === "wizard" ? (
        <BudgetSetupWizard
          entries={entries}
          mode="setup"
          monthlyTakeHome={
            picture.takeHome.status === "known" ? picture.takeHome.value.monthly : null
          }
          onAddEntry={addEntry}
          onDeleteEntry={async (id) => {
            await deleteEntry(id);
          }}
          onCancel={() => setView("budget")}
          onComplete={handleWizardComplete}
          onUpdateEntry={updateEntry}
        />
      ) : (
        <>
          {view === "editing" ? (
            <>
              {/* Removing or zeroing every entry keeps the editor open until Finish editing. */}
              {!isBudgetEmpty && <BudgetOverview entries={entries} picture={picture} />}
              <BudgetEditor
                categories={allCategories}
                entries={entries}
                onAdd={addEntry}
                onAddCategory={() => setIsAddCategoryOpen(true)}
                onDelete={deleteEntry}
                onDeleteCategory={handleDeleteCategory}
                onUpdate={updateEntry}
                removableCategories={customCategories}
              />
            </>
          ) : isBudgetEmpty ? (
            <EmptyState
              action={
                <Button
                  data-testid="add-suggested-defaults-btn"
                  disabled={isSeedingDefaults}
                  id="add-suggested-defaults-btn"
                  variant="outline"
                  onClick={handleAddSuggestedDefaults}
                >
                  {isSeedingDefaults ? "Adding…" : "Add example figures"}
                </Button>
              }
              description="Add your income and what you spend each month to see what is left over and how long your money lasts."
              illustration={<Illustration scene="onboarding" />}
              title="No budget yet"
            />
          ) : (
            <BudgetOverview entries={entries} picture={picture} />
          )}

          {view === "budget" && !isBudgetEmpty && (
            <BudgetCategoryList
              categories={allCategories}
              entries={entries}
              metaFor={(cat) => (cat === "housing" ? housingTenureLabel(housingStatus) : undefined)}
              openCategory={openCategory}
              renderEntries={renderEntries}
              onToggleCategory={(cat) => setOpenCategory((prev) => (prev === cat ? null : cat))}
            />
          )}

          {view === "budget" && !isBudgetEmpty && (
            <RunwayCalculator
              accountDetails={normalizedAccountDetails}
              accounts={accountsWithBalances}
              baseline={picture.monthsOfCover}
              entries={entries}
              scenario={runwayScenario}
              onScenarioChange={handleScenarioChange}
            />
          )}

          {/* The same line for every user, never triggered by their figures (ruling 1, R3, R4). */}
          <DebtHelpLink />
        </>
      )}

      <AddCategoryModal
        open={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        onAddCategory={handleAddCategory}
        existingCategories={allCategories}
      />
    </PageBody>
  );
};

export default BudgetContainer;
