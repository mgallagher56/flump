import {
  AddBudgetCategoryResponse,
  BudgetEntryListResponse,
  BudgetEntryResponse,
  DeleteBudgetEntryResponse,
  etagFor,
} from "@flump/api-contract";
import {
  DEBT_CATEGORY,
  findPossibleDuplicateDebtRows,
  PortfolioSnapshot,
} from "@flump/finance-engine";
import {
  Button,
  DataList,
  EmptyState,
  Icon,
  Illustration,
  InlineAlert,
  PageBody,
  PageHeader,
  useOptionalToast,
} from "@repo/ui";
import { ListChecks, Pencil } from "lucide-react";
import { type FC, useEffect, useMemo, useRef, useState } from "react";
import { useLoaderData } from "react-router";
import { AddCategoryModal } from "~/features/budget/components/AddCategoryModal";
import { BudgetCategoryList } from "~/features/budget/components/BudgetCategoryList";
import { BudgetEditor } from "~/features/budget/components/BudgetEditor";
import { BudgetOverview } from "~/features/budget/components/BudgetOverview";
import { BudgetSetupWizard } from "~/features/budget/components/BudgetSetupWizard";
import { DuplicateDebtNotice } from "~/features/budget/components/DuplicateDebtNotice";
import { RunwayCalculator } from "~/features/budget/components/RunwayCalculator";
import {
  type DraftBudgetEntry,
  entryFromDraft,
  exampleBudgetDrafts,
  isDraftReady,
} from "~/features/budget/exampleDrafts";
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

/**
 * Entries the person chose to keep where they are, remembered for this browser session only: the
 * profile has no field for it, and a schema change is out of scope. Storage can be unavailable
 * (private windows, blocked site data), so every read and write is guarded.
 */
const KEPT_DEBT_ROWS_KEY = "flump.budget.keptDebtRows";

function readKeptDebtRows(): string[] {
  try {
    const raw = window.sessionStorage.getItem(KEPT_DEBT_ROWS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeKeptDebtRows(ids: string[]): void {
  try {
    window.sessionStorage.setItem(KEPT_DEBT_ROWS_KEY, JSON.stringify(ids));
  } catch {
    // Kept for this page view only.
  }
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
  // Common entries from "Add common entries": on the page only, saved only by "Save entries".
  const [drafts, setDrafts] = useState<DraftBudgetEntry[]>([]);
  // The latest drafts, so a save reads what was typed last, not the state one render ago.
  const draftsRef = useRef<DraftBudgetEntry[]>(drafts);
  draftsRef.current = drafts;
  // Drafts belong to the editing view: leaving it by any path (Finish editing, the wizard, a
  // category) drops them, so they never come back stale.
  useEffect(() => {
    if (view !== "editing") setDrafts((prev) => (prev.length > 0 ? [] : prev));
  }, [view]);

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

  const snapshot = useMemo(
    () => new PortfolioSnapshot(accounts, accountDetails),
    [accounts, accountDetails],
  );

  // Sync current balance for all accounts from latest accountDetails or direct balance
  const accountsWithBalances = useMemo(() => {
    return accounts.map((acc: any) => {
      const resolved = snapshot.getAccount(acc.id);
      return {
        ...acc,
        balance: resolved?.nominalBalance ?? (Number(acc.balance) || 0),
      };
    });
  }, [accounts, snapshot]);

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
  // tenure, and opening it says where the saved figure lives, or links to the mortgage page
  // (E16 R2-6).
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

  // Entries that may be a debt's own payment, so counted twice. Read view only; the engine only
  // reports them and changes no total.
  const [keptDebtRows, setKeptDebtRows] = useState<string[]>([]);
  // Read after mount, so the server and first client render agree.
  useEffect(() => {
    const stored = readKeptDebtRows();
    if (stored.length > 0) setKeptDebtRows((prev) => Array.from(new Set([...prev, ...stored])));
  }, []);
  const duplicateDebtRows = useMemo(
    () =>
      findPossibleDuplicateDebtRows(
        entries.map((e) => ({ ...e, amount: Number(e.amount) || 0 })),
        snapshot,
      ).filter((c) => !keptDebtRows.includes(c.rowId)),
    [entries, snapshot, keptDebtRows],
  );
  const toastApi = useOptionalToast();

  // The note's buttons go away with it, so focus moves to the category row it sat under (UX A3).
  const focusCategoryRow = (category: string) => {
    const slug =
      category
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "category";
    requestAnimationFrame(() => document.getElementById(`budget-category-${slug}`)?.focus());
  };

  const keepDebtRow = (rowId: string, category: string) => {
    const next = keptDebtRows.includes(rowId) ? keptDebtRows : [...keptDebtRows, rowId];
    writeKeptDebtRows(next);
    setKeptDebtRows(next);
    focusCategoryRow(category);
  };

  const moveRowToDebts = async (rowId: string) => {
    await updateEntry(rowId, { category: DEBT_CATEGORY });
    toastApi?.toast({ title: "Saved" });
    focusCategoryRow(DEBT_CATEGORY);
  };

  // At most one quiet note per category (AGENTS.md section 3); the next shows once this one is
  // answered.
  const renderDuplicateNotices = (category: string) => {
    const c = duplicateDebtRows.find((d) => d.rowCategory === category);
    if (!c) return null;
    return (
      <DuplicateDebtNotice
        debtAccountName={c.debtAccountName}
        key={c.rowId}
        monthlyAmount={c.monthlyAmount}
        rowName={c.rowName}
        onKeep={() => keepDebtRow(c.rowId, category)}
        onMove={() => moveRowToDebts(c.rowId)}
      />
    );
  };

  const handleWizardComplete = async () => {
    await markChecklistStep("budget", true);
    setView("budget");
  };

  // Common entries open in the editor, held on the page. Nothing is saved until "Save entries".
  // Only the ones the budget does not already have become drafts, so a saved row (old £0 seed rows
  // included) is never shown twice.
  const handleAddExampleRows = () => {
    setDrafts(exampleBudgetDrafts(entries));
    setView("editing");
  };

  const handleDraftChange = (id: string, update: Partial<DraftBudgetEntry>) => {
    setDrafts((prev) => {
      const next = prev.map((d) => (d.id === id ? { ...d, ...update } : d));
      draftsRef.current = next;
      return next;
    });
  };

  const handleDraftRemove = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  const focusEmptyStateButton = () =>
    requestAnimationFrame(() => document.getElementById("add-suggested-defaults-btn")?.focus());

  const handleRemoveDrafts = () => {
    setDrafts([]);
    if (isBudgetEmpty) {
      setView("budget");
      focusEmptyStateButton();
    }
  };

  /**
   * Saves the drafts that have a name and an amount above £0, one at a time, from the latest
   * draft state. Saved drafts leave the list; blank ones stay as drafts. Rejects when a save
   * fails, after setting one accurate message; the drafts not yet saved stay for another try.
   */
  const handleSaveDrafts = async () => {
    const ready = draftsRef.current.filter(isDraftReady);
    if (ready.length === 0) return;
    let saved = 0;
    let nonEmpty = !isBudgetEmpty;
    try {
      for (const draft of ready) {
        const latest = draftsRef.current.find((d) => d.id === draft.id) ?? draft;
        await addEntry(entryFromDraft(latest));
        saved += 1;
        nonEmpty = nonEmpty || (latest.amount ?? 0) > 0;
        setDrafts((prev) => {
          const next = prev.filter((d) => d.id !== draft.id);
          draftsRef.current = next;
          return next;
        });
      }
    } catch (err) {
      // With nothing saved, addEntry's own message stands; otherwise say exactly what was saved.
      if (saved > 0) {
        const noun = ready.length === 1 ? "entry" : "entries";
        setActionError(
          `We saved ${saved} of ${ready.length} ${noun}. The others are still here, so you can try again.`,
        );
      }
      throw err;
    }
    toastApi?.toast({ title: `Saved ${saved} ${saved === 1 ? "entry" : "entries"}` });
    if (nonEmpty) {
      // The editor stays open, so focus moves to its heading (UX A3).
      requestAnimationFrame(() => document.getElementById("budget-editor-heading")?.focus());
    } else {
      setView("budget");
      focusEmptyStateButton();
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
          .map((e, _i, rows) =>
            // One line per entry. A single entry is the row's own total, so it shows its name
            // only: its figure would repeat the row's (P6).
            rows.length > 1
              ? {
                  id: e.id,
                  label: e.name,
                  value: Math.abs(toMonthly(e)),
                  valueProps: { fractionDigits: 0, size: "sm" as const },
                }
              : { id: e.id, label: e.name },
          )}
        label={`${getCategoryLabel(category)} entries`}
        noun={{ one: "entry", other: "entries" }}
      />
    </>
  );

  return (
    <PageBody>
      <PageHeader
        actions={
          // Shown once anything is saved; leaving clears blank common entries, as their note says.
          view === "editing" && (drafts.length === 0 || !isBudgetEmpty) ? (
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
                drafts={drafts}
                onDraftChange={handleDraftChange}
                onDraftRemove={handleDraftRemove}
                onRemoveDrafts={handleRemoveDrafts}
                onSaveDrafts={handleSaveDrafts}
              />
            </>
          ) : isBudgetEmpty ? (
            <EmptyState
              action={
                <Button
                  data-testid="add-suggested-defaults-btn"
                  id="add-suggested-defaults-btn"
                  variant="outline"
                  onClick={handleAddExampleRows}
                >
                  Add common entries
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
              hrefFor={(cat) =>
                // A mortgage holder's housing row opens the mortgage page, where its details live.
                cat === "housing" && housingStatus === "mortgage"
                  ? { to: "/app/mortgage", page: "mortgage page" }
                  : undefined
              }
              metaFor={(cat) => (cat === "housing" ? housingTenureLabel(housingStatus) : undefined)}
              noticeFor={renderDuplicateNotices}
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
