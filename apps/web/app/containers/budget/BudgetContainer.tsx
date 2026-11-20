import {
  AddBudgetCategoryResponse,
  BudgetEntryListResponse,
  BudgetEntryResponse,
  DeleteBudgetEntryResponse,
} from "@flump/api-contract";
import {
  BUDGET_ACCOUNT_LINK_CATEGORY,
  BUDGET_HOUSING_CATEGORY,
  type BudgetAccountLinkOffer,
  type BudgetLinkOffer,
  budgetRowMonthly,
  getUkTaxYearContext,
  HOUSING_ROW_NAME,
  PortfolioSnapshot,
  takeHomeLeavesOut,
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
import { useLoaderData, useRevalidator, useSearchParams } from "react-router";
import { AccountLinkNotice } from "~/features/budget/components/AccountLinkNotice";
import { AddCategoryModal } from "~/features/budget/components/AddCategoryModal";
import { BreathingRoom } from "~/features/budget/components/BreathingRoom";
import { BreathingRoomBasis } from "~/features/budget/components/BreathingRoomBasis";
import { BudgetCategoryList } from "~/features/budget/components/BudgetCategoryList";
import { BudgetEditor } from "~/features/budget/components/BudgetEditor";
import { BudgetLinkNotice } from "~/features/budget/components/BudgetLinkNotice";
import { BudgetOverview } from "~/features/budget/components/BudgetOverview";
import { BudgetSetupWizard } from "~/features/budget/components/BudgetSetupWizard";
import { RunwayCalculator } from "~/features/budget/components/RunwayCalculator";
import { INCOME_CATEGORY } from "~/features/budget/income";
import {
  type LinkableAccount,
  linkedSourceText,
  pageBudgetEntries,
} from "~/features/budget/linkedEntries";
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
const SETUP_PARAM = "setup";
const SETUP_COMMON = "common";

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

/** A stable empty list, so a missing loader value never reads as new rows on every render. */
const NO_ENTRIES: BudgetEntry[] = [];

const BudgetContainer: FC = () => {
  const {
    accounts = [],
    accountDetails = [],
    budgetEntries = NO_ENTRIES,
    userProfile,
  } = useLoaderData<typeof loader>();

  const { profile, updateProfile, markChecklistStep } = useUserProfile();

  const [view, setView] = useState<BudgetView>("budget");
  // Fixed when the wizard opens, so saving amounts part way through never switches its mode.
  const [wizardMode, setWizardMode] = useState<"setup" | "add">("setup");
  const [searchParams, setSearchParams] = useSearchParams();
  // The one category whose entries are open in the list (E16 PR 5: rows open their entries).
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [entries, setEntries] = useState<BudgetEntry[]>(budgetEntries);
  // Each write reloads saved data (audit slice 8, L63): the hero, the Dashboard and the next page
  // read the saved lines, and the list follows the reloaded rows.
  const revalidator = useRevalidator();
  useEffect(() => {
    setEntries(budgetEntries);
  }, [budgetEntries]);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

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

  // A category an entry moves into (a line linked to a debt moves to "debt") shows too, without
  // being saved as a custom category of its own.
  const allCategories = useMemo(() => {
    const fromEntries = entries
      .map((e) => e.category)
      .filter((c) => !STANDARD_CATEGORIES.includes(c));
    return Array.from(new Set([...STANDARD_CATEGORIES, ...customCategories, ...fromEntries]));
  }, [customCategories, entries]);

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
  // Names and types for the savings and debt lines linked to an account (audit slice 5).
  const linkableAccounts = useMemo<LinkableAccount[]>(
    () =>
      accounts.map((a: { id?: unknown; name?: unknown; type?: unknown }) => ({
        id: String(a.id ?? ""),
        name: typeof a.name === "string" ? a.name : "",
        type: typeof a.type === "string" ? a.type : "",
      })),
    [accounts],
  );

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
      revalidator.revalidate();
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
      revalidator.revalidate();
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
    revalidator.revalidate();
    return true;
  };

  // Entries that match an account's monthly saving or payment (audit slice 5): each gets a quiet
  // note offering a one-tap link. "Keep my own figure" hides the note for this visit only; nothing
  // is stored, and nothing is linked unless the person taps.
  const [keptOffers, setKeptOffers] = useState<string[]>([]);
  const accountLinkOffers = useMemo(
    () => picture.budgetAccountLinkOffers.filter((o) => !keptOffers.includes(o.rowId)),
    [picture.budgetAccountLinkOffers, keptOffers],
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

  const keepOwnFigure = (offer: BudgetAccountLinkOffer) => {
    setKeptOffers((prev) => (prev.includes(offer.rowId) ? prev : [...prev, offer.rowId]));
    focusCategoryRow(offer.rowCategory);
  };

  // Links the entry to the account: it moves to the line's category (Savings or Debt) and stores
  // no amount of its own, so the account's monthly amount is the one figure, counted once.
  const linkToAccount = async (offer: BudgetAccountLinkOffer) => {
    const category = BUDGET_ACCOUNT_LINK_CATEGORY[offer.link];
    await updateEntry(offer.rowId, {
      amount: 0,
      category,
      linkKind: offer.link,
      linkAccountId: offer.accountId,
    });
    toastApi?.toast({ title: "Saved" });
    focusCategoryRow(category);
  };

  // At most one quiet note per category (AGENTS.md section 3); the next shows once this one is
  // answered.
  const renderAccountLinkNotices = (category: string) => {
    const offer = accountLinkOffers.find((o) => o.rowCategory === category);
    if (!offer) return null;
    return (
      <AccountLinkNotice
        key={offer.rowId}
        offer={offer}
        onKeep={() => keepOwnFigure(offer)}
        onLink={() => linkToAccount(offer)}
      />
    );
  };

  const handleWizardComplete = async () => {
    await markChecklistStep("budget", true);
    setView("budget");
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
          savedAmount={pictureProfile?.monthlyHousingCost ?? null}
          onSave={handleSaveHousing}
        />
      )}
      {/* Read only: entries are edited in place with "Edit budget" (E16 round 3). */}
      <DataList
        items={pageEntries
          .filter((e) => e.category === category && !e.isIncome)
          .map((e, _i, rows) =>
            // A linked line whose saved fact is not set shows "Not set", never £0, and says why;
            // the housing details above, the mortgage page or the account's page is where it is
            // added.
            e.notSet
              ? {
                  id: e.id,
                  label: e.name,
                  secondary: linkedSourceText(e, linkableAccounts),
                  value: null,
                  valueProps: { size: "sm" as const },
                }
              : // One line per entry. A single entry is the row's own total, so it shows its name
                // only: its figure would repeat the row's (P6).
                rows.length > 1
                ? {
                    id: e.id,
                    label: e.name,
                    secondary: linkedSourceText(e, linkableAccounts),
                    value: Math.abs(budgetRowMonthly(e)),
                    valueProps: { fractionDigits: 0, size: "sm" as const },
                  }
                : { id: e.id, label: e.name, secondary: linkedSourceText(e, linkableAccounts) },
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
          view === "editing" ? (
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
          takeHomeNotice={
            picture.takeHome.status === "known"
              ? takeHomeLeavesOut(picture.takeHome).join(" ") || null
              : (picture.takeHome.notice ?? null)
          }
          housingPayment={picture.housingPayment}
          accounts={snapshot}
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
                linkedEntries={linkedEntries}
                linkableAccounts={linkableAccounts}
                accountLinkOffers={picture.budgetAccountLinkOffers}
                shadowedIds={picture.shadowedBudgetRowIds}
                linkOffers={picture.budgetLinkOffers}
                housingStatus={housingStatus}
                onSaveHousing={handleSaveHousing}
                onFinishEditing={() => setView("budget")}
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
              noticeFor={renderAccountLinkNotices}
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
