import {
  AddBudgetCategoryResponse,
  BudgetEntryListResponse,
  BudgetEntryResponse,
  DeleteBudgetEntryResponse,
} from "@flump/api-contract";
import {
  BUDGET_HOUSING_CATEGORY,
  type BudgetLinkOffer,
  budgetRowMonthly,
  DEBT_CATEGORY,
  findPossibleDuplicateDebtRows,
  getUkTaxYearContext,
  HOUSING_ROW_NAME,
  PortfolioSnapshot,
} from "@flump/finance-engine";
import {
  Button,
  DataList,
  EmptyState,
  Icon,
  InlineAlert,
  PageBody,
  PageHeader,
  TaxRatesStatusBanner,
  useOptionalToast,
} from "@repo/ui";
import { ListPlus } from "lucide-react";
import { type FC, useEffect, useMemo, useRef, useState } from "react";
import { useLoaderData, useSearchParams } from "react-router";
import { AddCategoryModal } from "~/features/budget/components/AddCategoryModal";
import { BreathingRoom } from "~/features/budget/components/BreathingRoom";
import { BreathingRoomBasis } from "~/features/budget/components/BreathingRoomBasis";
import { BudgetCategoryList } from "~/features/budget/components/BudgetCategoryList";
import { BudgetEditor } from "~/features/budget/components/BudgetEditor";
import { BudgetLinkNotice } from "~/features/budget/components/BudgetLinkNotice";
import { BudgetOverview } from "~/features/budget/components/BudgetOverview";
import { BudgetSetupWizard } from "~/features/budget/components/BudgetSetupWizard";
import { DuplicateDebtNotice } from "~/features/budget/components/DuplicateDebtNotice";
import { RunwayCalculator } from "~/features/budget/components/RunwayCalculator";
import {
  type DraftBudgetEntry,
  entryFromDraft,
  isDraftReady,
} from "~/features/budget/exampleDrafts";
import { INCOME_CATEGORY } from "~/features/budget/income";
import { pageBudgetEntries } from "~/features/budget/linkedEntries";
import { missingWizardCommonItems } from "~/features/budget/wizardCommonItems";
import { DebtHelpLink } from "~/features/debt/components/DebtHelpLink";
import {
  HousingDetails,
  type HousingTenure,
  housingTenureLabel,
} from "~/features/housing/components/HousingDetails";
import { useUserProfile } from "~/hooks/useUserProfile";
import type { loader } from "~/routes/app.budget";
import { apiFetch, apiFetchAll } from "~/services/api-client";
import { CONFLICT_MESSAGE, isConflict, versionEtag } from "~/services/conflict";
import { type BudgetEntry, getCategoryLabel } from "~/types/budget";
import { buildWorkspacePicture } from "~/utils/financialPicture";
import { clearRunwaySettings, type RunwayScenario } from "~/utils/runwayStorage";

/**
 * The page shows the budget, the budget with its entries editable in place (E16 round 3), or the
 * wizard in its place: first-time setup on an empty budget, or adding common items to one that has
 * entries (the onboarding seed rows, say).
 */
type BudgetView = "budget" | "editing" | "wizard";

/**
 * `?setup=common` opens the wizard once on load (the onboarding finish step links here). It
 * carries no money: on an empty budget it opens first-time setup, otherwise "add common items".
 */
export const SETUP_PARAM = "setup";
export const SETUP_COMMON = "common";

const STANDARD_CATEGORIES: string[] = ["housing", "bills", "expenses", "savings", "income"];

/**
 * Leaves out the keys the backend accepts and ignores on budget-entry writes (`isPrimaryIncome`
 * and `isDefault` are server-owned, `contractEndDate` has no column), so they are never sent.
 */
const LINKED_TAKE_HOME_ENTRY = { link: "take_home", kind: null } as const;

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
  // Fixed when the wizard opens, so saving amounts part way through never switches its mode.
  const [wizardMode, setWizardMode] = useState<"setup" | "add">("setup");
  const [searchParams, setSearchParams] = useSearchParams();
  // The one category whose entries are open in the list (E16 PR 5: rows open their entries).
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [entries, setEntries] = useState<BudgetEntry[]>(budgetEntries);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  // Common entries from "Add common budget items": on the page only, saved only by "Save entries".
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

  // Rows as saved (whole balance, ownership kept). The runway builds its own PortfolioSnapshot,
  // which applies a joint share once; rows already at share would be shared twice (JO-2).
  const accountsWithBalances = accounts;

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
  // The rows the page lists: saved rows with the linked take-home and housing rows in place, so a
  // row and the figures it adds to agree (owner items 7 and 33b).
  const pageEntries = useMemo(() => pageBudgetEntries(entries, picture), [entries, picture]);
  const linkedEntries = useMemo(() => pageEntries.filter((e) => e.linked), [pageEntries]);

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

  // "Add your take-home pay of £X" (or rent): a new entry linked to the saved figure, beside the
  // person's own entries. Its stored amount is £0 and never read.
  const addLinkedEntry = (offer: Pick<BudgetLinkOffer, "link" | "kind">) =>
    addEntry({
      category: offer.link === "take_home" ? INCOME_CATEGORY : BUDGET_HOUSING_CATEGORY,
      name: offer.link === "take_home" ? "Take-home pay" : HOUSING_ROW_NAME[offer.kind ?? "rent"],
      amount: 0,
      frequency: "monthly",
      isIncome: offer.link === "take_home",
      isPrimaryIncome: false,
      isEssential: true,
      ownership: "sole",
      sharePercent: null,
      notes: null,
      isDefault: false,
      linkKind: offer.link,
    });

  // A linked row stores £0 and reads its figure from a saved fact, so it is a budget line whatever
  // its stored amount. With no saved rows at all the budget is empty, saved facts or not, so a new
  // person still gets the setup wizard.
  const isBudgetEmpty = useMemo(() => {
    if (entries.length === 0) return true;
    if (entries.some((e) => e.linkKind)) return false;
    const total = entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    return total === 0;
  }, [entries]);

  const openWizard = () => {
    setWizardMode(isBudgetEmpty ? "setup" : "add");
    setView("wizard");
  };

  // Common items the wizard can still add: none, and the "add" entry point is not offered.
  const hasMissingCommonItems = useMemo(
    () => missingWizardCommonItems(pageEntries).length > 0,
    [pageEntries],
  );

  // ?setup=common opens the wizard once per visit, like the mortgage page's ?tool=, then is taken
  // out of the address (other params kept) so a reload does not open it again.
  const setupParam = searchParams.get(SETUP_PARAM);
  const handledSetupParam = useRef(false);
  // The latest openWizard, so the effect below runs on the param alone.
  const openWizardRef = useRef(openWizard);
  openWizardRef.current = openWizard;
  useEffect(() => {
    if (setupParam !== SETUP_COMMON || handledSetupParam.current) return;
    handledSetupParam.current = true;
    openWizardRef.current();
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(SETUP_PARAM);
        return next;
      },
      // Same page: clearing the parameter never moves the reader.
      { replace: true, preventScrollReset: true },
    );
  }, [setupParam, setSearchParams]);

  const [actionError, setActionError] = useState<string | null>(null);
  // The saved entries as of the last write, so adds made one after another (before a re-render)
  // see each other.
  const savedEntriesRef = useRef(entries);
  savedEntriesRef.current = entries;

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
      savedEntriesRef.current = [...savedEntriesRef.current, created];
      setEntries((prev) => [...prev, created]);
    } catch (err) {
      setActionError("We could not add that entry. Nothing has changed. Try again.");
      throw err;
    }
  };

  // An entry the person adds themselves (editor add row, wizard). A take-home or housing line the
  // engine added on its own counts only while the budget has no row of that kind, so adding one
  // ("Child benefit") would drop the figure they were looking at. Before that first row of the
  // kind is added, the line is saved as a stored row linked to the saved figure (amount £0, the
  // link checks apply), so it stays in the budget and the link rule holds from then on. A figure
  // typed over that line replaces it, so it is saved alone and the line is not kept.
  const addOwnEntry = async (
    entry: Omit<BudgetEntry, "id" | "userId" | "createdAt" | "updatedAt">,
    options?: { replacesLinkedLine?: boolean },
  ) => {
    const current = savedEntriesRef.current;
    if (!entry.linkKind && !options?.replacesLinkedLine && current.length > 0) {
      const isHousing = !entry.isIncome && entry.category === BUDGET_HOUSING_CATEGORY;
      if (
        entry.isIncome &&
        picture.takeHome.status === "known" &&
        !current.some((e) => e.isIncome)
      ) {
        await addLinkedEntry(LINKED_TAKE_HOME_ENTRY);
      } else if (
        isHousing &&
        picture.housingPayment &&
        !current.some((e) => !e.isIncome && e.category === BUDGET_HOUSING_CATEGORY)
      ) {
        await addLinkedEntry({ link: "housing", kind: picture.housingPayment.kind });
      }
    }
    await addEntry(entry);
  };

  const updateEntry = async (id: string, update: Partial<BudgetEntry>) => {
    try {
      const current = entries.find((e) => e.id === id);
      const updated = await apiFetch(`/budget-entries/${id}`, {
        method: "PATCH",
        body: writableEntryFields(update),
        schema: BudgetEntryResponse,
        ifMatch: versionEtag(current?.updatedAt),
      });
      setActionError(null);
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    } catch (err) {
      setActionError(
        isConflict(err)
          ? CONFLICT_MESSAGE
          : "We could not save your changes. Nothing has changed. Try again.",
      );
      // 412: the row changed elsewhere since it was loaded. Reload the rows so the next try sends
      // the current version; the editor keeps what was typed because the save rejects.
      if (isConflict(err)) {
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

  /**
   * "Edit budget" opens the editor in place, below the hero, so on a phone it starts below the
   * fold. Focus moves to its heading and scrolls it into view (phone audit P33, UX A3).
   */
  const openEditor = () => {
    setView("editing");
    requestAnimationFrame(() =>
      document.getElementById("budget-editor-heading")?.focus({ preventScroll: false }),
    );
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
          rowTotal={pageEntries
            .filter((e) => e.category === "housing" && !e.isIncome)
            .reduce((sum, e) => sum + Math.abs(budgetRowMonthly(e)), 0)}
          savedAmount={pictureProfile?.monthlyHousingCost ?? null}
          onSave={handleSaveHousing}
        />
      )}
      {/* Read only: entries are edited in place with "Edit budget" (E16 round 3). */}
      <DataList
        items={pageEntries
          .filter((e) => e.category === category && !e.isIncome)
          .map((e, _i, rows) =>
            // A linked line whose saved fact is not set shows "Not set", never £0; the housing
            // details above (or the mortgage page) are where it is added.
            e.notSet
              ? {
                  id: e.id,
                  label: e.name,
                  secondary: "Linked to your saved housing payment, which is not set",
                  value: null,
                  valueProps: { size: "sm" as const },
                }
              : // One line per entry. A single entry is the row's own total, so it shows its name
                // only: its figure would repeat the row's (P6).
                rows.length > 1
                ? {
                    id: e.id,
                    label: e.name,
                    value: Math.abs(budgetRowMonthly(e)),
                    valueProps: { fractionDigits: 0, size: "sm" as const },
                  }
                : { id: e.id, label: e.name },
          )}
        label={`${getCategoryLabel(category)} entries`}
        noun={{ one: "entry", other: "entries" }}
      />
    </>
  );

  const ratesContext = useMemo(() => getUkTaxYearContext(), []);

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
          ) : view === "budget" && !isBudgetEmpty && hasMissingCommonItems ? (
            // A saved budget is edited from "Where your money goes" (owner item 30), the page's
            // one edit action; the wizard adds the common items it does not have yet (never
            // touching saved entries). An empty page has no header action: its empty state holds
            // the one way in (phone audit P52).
            <Button
              data-testid="add-common-items-btn"
              id="add-common-items-btn"
              variant="outline"
              onClick={openWizard}
            >
              <Icon icon={ListPlus} size="sm" />
              Add common budget items
            </Button>
          ) : undefined
        }
        // The page icon, empty or filled in; the empty state has none, so one is in view.
        illustration="onboarding"
        subtitle="Your income, spending and how long your money lasts."
        title="Your budget"
      />

      <TaxRatesStatusBanner {...ratesContext} />

      {actionError && <InlineAlert tone="danger">{actionError}</InlineAlert>}

      {view === "wizard" ? (
        <BudgetSetupWizard
          entries={entries}
          mode={wizardMode}
          monthlyTakeHome={
            picture.takeHome.status === "known" ? picture.takeHome.value.monthly : null
          }
          housingPayment={picture.housingPayment}
          onAddEntry={addOwnEntry}
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
              <BudgetLinkNotice offers={picture.budgetLinkOffers} onAdd={addLinkedEntry} />
              <BudgetEditor
                categories={allCategories}
                entries={entries}
                onAdd={addOwnEntry}
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
                linkedEntries={linkedEntries}
                shadowedIds={picture.shadowedBudgetRowIds}
                linkOffers={picture.budgetLinkOffers}
                housingStatus={housingStatus}
                onSaveHousing={handleSaveHousing}
                onFinishEditing={
                  drafts.length === 0 || !isBudgetEmpty ? () => setView("budget") : undefined
                }
              />
            </>
          ) : isBudgetEmpty ? (
            <EmptyState
              action={
                <Button
                  data-testid="add-suggested-defaults-btn"
                  id="add-suggested-defaults-btn"
                  variant="primary"
                  // The same flow as the filled page's button of the same name: the wizard, in
                  // setup mode for an empty budget.
                  onClick={openWizard}
                >
                  Add common budget items
                </Button>
              }
              description="Add your income and what you spend each month to see what is left over and how long your money lasts."
              title="No budget yet"
            />
          ) : (
            <>
              <BudgetOverview entries={entries} picture={picture} />
              <BudgetLinkNotice
                offers={picture.budgetLinkOffers}
                onAdd={addLinkedEntry}
                onChooseEntry={() => setView("editing")}
              />
            </>
          )}

          {view === "budget" && !isBudgetEmpty && (
            <BudgetCategoryList
              categories={allCategories}
              entries={pageEntries}
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
              onEditBudget={openEditor}
              onToggleCategory={(cat) => setOpenCategory((prev) => (prev === cat ? null : cat))}
            />
          )}

          {/* The saved figure, in a section of its own; the zone below only illustrates changes. */}
          {view === "budget" && !isBudgetEmpty && (
            <BreathingRoom
              basis={
                <BreathingRoomBasis
                  accountDetails={normalizedAccountDetails}
                  accounts={accountsWithBalances}
                  entries={pageEntries}
                  onSetEssential={async (id, isEssential) => {
                    await updateEntry(id, { isEssential });
                    toastApi?.toast({ title: "Saved" });
                  }}
                />
              }
              figure={picture.monthsOfCover}
            />
          )}

          {view === "budget" && !isBudgetEmpty && (
            <RunwayCalculator
              accountDetails={normalizedAccountDetails}
              accounts={accountsWithBalances}
              baseline={picture.monthsOfCover}
              collapsible
              entries={pageEntries}
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
