import {
  breathingRoomPhrase,
  clampRunwayCut,
  clampRunwayLump,
  describeBreathingRoom,
  isFigureKnown,
  type RunwayScenarioInputs,
  runwayIllustration,
} from "@flump/finance-engine/budget";
import * as Crypto from "expo-crypto";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Linking, Modal, type ScrollViewInstance, View } from "react-native";
import { BreathingRoom } from "../../components/BreathingRoom";
import { BudgetCategoryList } from "../../components/BudgetCategoryList";
import { BudgetEditor } from "../../components/BudgetEditor";
import type { EditorSectionView } from "../../components/BudgetEditor/BudgetEditor";
import { BudgetEntryForm } from "../../components/BudgetEntryForm";
import type {
  EntryValues,
  ValidEntryValues,
} from "../../components/BudgetEntryForm/BudgetEntryForm";
import { Button } from "../../components/Button";
import { CollapsibleDrawer } from "../../components/CollapsibleDrawer";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { CurrencyInput } from "../../components/CurrencyInput";
import { DebtHelpLink } from "../../components/DebtHelpLink";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { FormField } from "../../components/FormField";
import { HeroFigure } from "../../components/HeroFigure";
import { InlineAlert } from "../../components/InlineAlert";
import { KpiStrip } from "../../components/KpiStrip";
import { ScenarioZone } from "../../components/ScenarioZone";
import { Screen } from "../../components/Screen";
import { Switch } from "../../components/Switch";
import { TaxRatesStatusBanner } from "../../components/TaxRatesStatusBanner";
import { Text } from "../../components/Text";
import { Toast } from "../../components/Toast";
import {
  BREATHING_ROOM,
  BUDGET,
  deleteMessage,
  deleteTitle,
  EDITOR,
  EMPTY,
  equationShown,
  equationSpoken,
  housingTenureLabel,
  linkedSourceText,
  OVERVIEW,
  optionHint,
  RUNWAY,
  runwayAnnouncement,
  runwayResultSpoken,
  runwaySummaryModified,
  runwaySummarySaved,
  safeToSpendLine,
} from "../../copy/budget";
import { CHECK_IN } from "../../copy/checkIn";
import { OPEN_FLUMP_WEBSITE } from "../../copy/navigation";
import {
  type AppBudgetEntry,
  type BudgetWriteResult,
  useBudgetEntriesQuery,
  useBudgetWrites,
} from "../../data/budget";
import { useCheckInQueries } from "../../data/checkIn";
import { useDelayedLoading } from "../../data/useDelayedLoading";
import { amountProblem, amountProblemMessage } from "../../features/accounts/accountFormModel";
import {
  categoryChoices,
  defaultEssential,
  editableRow,
  editorSections,
} from "../../features/budget/budgetModel";
import {
  type BudgetDataState,
  type BudgetPageState,
  useBudgetData,
} from "../../features/budget/useBudgetData";
import { ShellContext, type WebLink } from "../../navigation/shell";
import { NotSetUp } from "../NotSetUp";
import { TermsRequired } from "../TermsRequired";

/** The Budget tab sits under the tab header and above the tab bar, which pad the top and bottom. */
const TAB_EDGES = ["right", "left"] as const;

/** The website pages the Budget tab links to until the app has them (S11, S12, S15). */
export interface BudgetWebLinks {
  /** Web's onboarding, for a person who has not finished setting up. */
  setUp: WebLink;
  /** Web's Budget page: the setup wizard, linked and joint entries, categories and housing. */
  budget: WebLink;
  /** Web's mortgage page, which a mortgage holder's housing row opens (S11). */
  mortgage: WebLink;
  /** Web's Profile, where the salary behind take-home pay is added. */
  salary: WebLink;
}

export interface BudgetProps {
  /** Sign out, offered by the terms screen. */
  onSignOut(): void;
  /** The website, for the terms screen. */
  marketingOrigin: string;
  links: BudgetWebLinks;
  /** Opens the app's Accounts tab, where the savings accounts are listed (S6). */
  onOpenAccounts(): void;
  /** Injected clock for tests. */
  now?: () => Date;
}

const open = (link: WebLink) => () => void Linking.openURL(link.url);

/**
 * The Budget tab (E12 S10, plan 9.10b): web's Budget page for the same rows. The title, the rates
 * sentence, the overview (hero, two figures, equation line), where the money goes, Breathing room
 * with what it counts, the what-if zone, and the debt help line, in web's order and words. "Edit
 * budget" opens the editor in place, as web's, where the person's own sole, unlinked entries are
 * added, changed and deleted in a sheet; linked and joint entries are changed on the website for
 * now. Every figure comes from the engine (`selectBudgetPageFromRows`, `runwayIllustration`).
 */
export function Budget({
  onSignOut,
  marketingOrigin,
  links,
  onOpenAccounts,
  now = () => new Date(),
}: BudgetProps) {
  const data = useBudgetData(now);
  const { refreshAll } = useCheckInQueries();
  const budget = useBudgetEntriesQuery();
  // Pull to refresh reads again everything the page shows: the check-in's reads and the budget.
  const onRefresh = () => Promise.all([refreshAll(), budget.refetch()]).then(() => undefined);
  const skeleton = useDelayedLoading(data.status === "loading");
  // "Saved" and a save's error sit in the flow at the top of the page (Toast has no floating), so
  // after a change made far down the editor the page scrolls back to them, as the account form
  // does with its alert; otherwise they were out of sight (Maestro's budget flow).
  const scrollRef = useRef<ScrollViewInstance>(null);
  const showMessages = useCallback(
    () => scrollRef.current?.scrollTo({ y: 0, animated: false }),
    [],
  );
  if (data.status === "error" && data.problem === "termsNotAccepted") {
    return (
      <TermsRequired
        marketingOrigin={marketingOrigin}
        onRetry={data.retry}
        onSignOut={onSignOut}
        edges={TAB_EDGES}
      />
    );
  }
  if (data.status === "notSetUp") return <NotSetUp setUp={links.setUp} edges={TAB_EDGES} />;
  return (
    <Screen edges={TAB_EDGES} testID="budget" onRefresh={onRefresh} scrollRef={scrollRef}>
      <View>
        <Text accessibilityRole="header" textStyle="heading.md">
          {BUDGET.title}
        </Text>
        <Text color="secondary">{BUDGET.subtitle}</Text>
      </View>
      <Body
        data={data}
        skeleton={skeleton}
        links={links}
        onOpenAccounts={onOpenAccounts}
        onMessage={showMessages}
      />
    </Screen>
  );
}

function Body({
  data,
  skeleton,
  links,
  onOpenAccounts,
  onMessage,
}: {
  data: Exclude<BudgetDataState, { status: "notSetUp" }>;
  skeleton: boolean;
  links: BudgetWebLinks;
  onOpenAccounts(): void;
  onMessage(): void;
}) {
  if (data.status === "error") {
    // Never "No budget yet" or £0 for a failed read; out of step never blames the connection.
    return (
      <ErrorState
        heading={BUDGET.loadErrorHeading}
        body={
          data.problem === "outOfStep" ? CHECK_IN.loadErrorOutOfStepBody : CHECK_IN.loadErrorBody
        }
        retryLabel={CHECK_IN.tryAgain}
        testID="budget-error"
        retryTestID="budget-retry"
        onRetry={data.retry}
      />
    );
  }
  if (data.status === "loading") {
    return skeleton ? (
      <HeroFigure
        label={OVERVIEW.leftOver}
        value={null}
        loading
        loadingLabel={BUDGET.loading}
        testID="budget-hero-loading"
      />
    ) : null;
  }
  return <Ready data={data} links={links} onOpenAccounts={onOpenAccounts} onMessage={onMessage} />;
}

type ReadyData = Extract<BudgetDataState, { status: "ready" }>;

/** The sheet over the page: adding to a category, or editing one saved row. */
type Sheet =
  /**
   * `requestKey` is the add's Idempotency-Key, made when the sheet opens (expo-crypto: Hermes has no
   * global `crypto.randomUUID`), so a retry of the same add is one entry and the next add is new.
   */
  | { mode: "add"; category: string; requestKey: string }
  | { mode: "edit"; id: string; row: AppBudgetEntry }
  | null;

/** "Saved" or "Entry deleted", with a count so the same words are read again. */
interface ToastState {
  message: string;
  count: number;
}

function Ready({
  data,
  links,
  onOpenAccounts,
  onMessage,
}: {
  data: ReadyData;
  links: BudgetWebLinks;
  onOpenAccounts(): void;
  /** A new toast or error sits at the top of the page: bring it into view (as the account form). */
  onMessage(): void;
}) {
  const { page, saved, housingStatus, customCategories } = data;
  const writes = useBudgetWrites();
  // Saved figures shown offline (E12 S7): no Edit budget, no editor and no Breathing room
  // switches, since each writes; the notice above already says changes need a connection. Read
  // softly: tests render no shell. The what-if zone stays, as it sends nothing. A sheet already
  // open when the connection drops stays open with what was typed (E12 S7 follow-up).
  const offline = useContext(ShellContext)?.offline ?? false;
  const [chosenView, setView] = useState<"budget" | "editing">("budget");
  const view = offline ? "budget" : chosenView;
  const [sheet, setSheet] = useState<Sheet>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  useEffect(() => {
    if (toast || actionError) onMessage();
  }, [toast, actionError, onMessage]);
  const toasts = useRef(0);
  const say = (message: string) => {
    toasts.current += 1;
    setToast({ message, count: toasts.current });
  };
  const website = links.budget.exact ? undefined : OPEN_FLUMP_WEBSITE;

  const setEssential = async (id: string, isEssential: boolean) => {
    const result = await writes.update(id, { isEssential });
    if (result === "saved") {
      setActionError(null);
      say(EDITOR.saved);
    } else {
      setActionError(result === "conflict" ? EDITOR.conflict : EDITOR.saveFailed);
    }
    return result;
  };

  return (
    <>
      <TaxRatesStatusBanner rates={page.ratesContext} />
      {actionError ? <InlineAlert message={actionError} testID="budget-action-error" /> : null}
      {toast ? <Toast key={toast.count} message={toast.message} testID="budget-toast" /> : null}
      {view === "editing" ? (
        <>
          {page.isEmpty ? null : <Overview page={page} links={links} />}
          <Editor
            data={data}
            onEdit={(id, row) => setSheet({ mode: "edit", id, row })}
            onAdd={(category) =>
              setSheet({ mode: "add", category, requestKey: Crypto.randomUUID() })
            }
            onOpenWebsite={open(links.budget)}
            onFinish={() => setView("budget")}
          />
        </>
      ) : page.isEmpty ? (
        <EmptyState
          title={EMPTY.title}
          description={EMPTY.description}
          actions={[
            {
              label: website ?? EMPTY.action,
              variant: "link",
              onPress: open(links.budget),
              testID: "budget-empty-action",
            },
          ]}
          testID="budget-empty"
        />
      ) : (
        <>
          <Overview page={page} links={links} />
          <BudgetCategoryList
            rows={page.categories.map((row) => ({
              category: row.category,
              total: row.total,
              count: row.count,
              notSet: row.notSet,
              entries: row.entries.map(({ entry, figure, source }) => ({
                id: entry.id,
                name: entry.name,
                figure,
                source: linkedSourceText(source),
              })),
            }))}
            metaFor={(c) => (c === "housing" ? housingTenureLabel(housingStatus) : undefined)}
            linkFor={(c) =>
              c === "housing" && housingStatus === "mortgage" ? open(links.mortgage) : undefined
            }
            onEditBudget={offline ? undefined : () => setView("editing")}
          />
          <BreathingRoom
            figure={isFigureKnown(page.monthsOfCover) ? page.monthsOfCover.value : null}
            drawOn={page.basis.drawOn.map(({ account, balance }) => ({
              id: account.id,
              name: account.name,
              balance,
            }))}
            spending={page.basis.spending.map((row) => ({
              id: row.entry.id,
              name: row.entry.name,
              category: row.entry.category,
              monthly: row.monthly,
              fixedReason: row.fixedReason,
              counted: row.counted,
              // Joint and linked entries are read-only on the phone, their essential flag too.
              editable: !offline && editableRow(row.entry, saved) !== null,
            }))}
            counted={page.basis.counted}
            onSetEssential={setEssential}
            onViewSavings={onOpenAccounts}
          />
          <Runway page={page} />
        </>
      )}
      {/* The same line for everyone, never triggered by their figures (ruling 1, R3, R4). */}
      <DebtHelpLink />
      {/* Kept open when the connection drops, so what was typed is not lost; Save waits for it. */}
      <EntrySheet
        sheet={sheet}
        offline={offline}
        categories={categoryChoices(page.rows, customCategories)}
        onClose={() => setSheet(null)}
        onDone={(message) => {
          setSheet(null);
          setActionError(null);
          say(message);
        }}
      />
    </>
  );
}

/** Web's `BudgetOverview`: the hero, money in and going out, and the equation line. */
function Overview({ page, links }: { page: BudgetPageState; links: BudgetWebLinks }) {
  const o = page.overview;
  const prompt =
    o.prompt?.kind === "refused"
      ? o.prompt.notice
      : o.prompt?.kind === "takeHomeNotSet"
        ? OVERVIEW.takeHomeNotSet
        : o.prompt?.kind === "housingNotSet"
          ? OVERVIEW.housingNotSet
          : OVERVIEW.emptyPrompt;
  const action =
    o.prompt?.kind === "takeHomeNotSet"
      ? { label: links.salary.exact ? OVERVIEW.addSalary : OPEN_FLUMP_WEBSITE, link: links.salary }
      : o.prompt?.kind === "housingNotSet"
        ? {
            label: links.budget.exact ? OVERVIEW.addHousing : OPEN_FLUMP_WEBSITE,
            link: links.budget,
          }
        : null;
  const base =
    o.subline === "safeToSpend" && o.safeToSpendMonthly !== null
      ? safeToSpendLine(o.safeToSpendMonthly)
      : o.subline === "addSalary"
        ? OVERVIEW.addSalaryLine
        : o.subline === "addEssentials"
          ? OVERVIEW.addEssentialsLine
          : null;
  // What the left over leaves out, said once beside the figure it changes.
  const subline = [base, o.leavesOut].filter(Boolean).join(" ") || null;
  return (
    <>
      <HeroFigure
        label={o.isShort ? OVERVIEW.short : OVERVIEW.leftOver}
        value={o.heroFigure}
        caption={subline}
        emptyPrompt={prompt}
        emptyAction={
          action
            ? { label: action.label, onPress: open(action.link), testID: "budget-hero-action" }
            : undefined
        }
        testID="budget-hero"
      />
      {o.heroFigure !== null && o.subline === "addSalary" ? (
        <Button
          label={links.salary.exact ? OVERVIEW.addSalary : OPEN_FLUMP_WEBSITE}
          variant="link"
          size="sm"
          accessibilityRole="link"
          testID="budget-add-salary"
          onPress={open(links.salary)}
        />
      ) : null}
      <KpiStrip
        items={
          o.supportingUnknown
            ? []
            : [
                {
                  key: "money-in",
                  label: OVERVIEW.moneyIn,
                  value: o.income,
                  caption: OVERVIEW.moneyInCaption,
                },
                {
                  key: "going-out",
                  label: OVERVIEW.goingOut,
                  value: o.goingOut,
                  caption: OVERVIEW.goingOutCaption,
                },
              ]
        }
        emptyPrompt={OVERVIEW.supportingPrompt}
        testID="budget-figures"
      />
      {o.showsEquation ? (
        <Text
          accessible
          accessibilityLabel={equationSpoken(o.isShort)}
          textStyle="body.sm"
          color="secondary"
          testID="budget-equation"
        >
          {equationShown(o.isShort)}
        </Text>
      ) : null}
    </>
  );
}

/** The editor in place of the read view's lists, as web's "Edit budget". */
function Editor({
  data,
  onEdit,
  onAdd,
  onOpenWebsite,
  onFinish,
}: {
  data: ReadyData;
  onEdit(id: string, row: AppBudgetEntry): void;
  onAdd(category: string): void;
  onOpenWebsite(): void;
  onFinish(): void;
}) {
  const { page, saved, customCategories } = data;
  // Taken once on opening, so a section never jumps while it is being filled in (web's rule).
  const [order] = useState(() =>
    editorSections(page.rows, customCategories).map((s) => s.category),
  );
  const sections = useMemo((): EditorSectionView[] => {
    const now = editorSections(page.rows, customCategories);
    const byCategory = new Map(now.map((s) => [s.category, s]));
    const categories = Array.from(new Set([...order, ...now.map((s) => s.category)]));
    return categories.map((category) => ({
      category,
      rows: (byCategory.get(category)?.rows ?? []).map((row) => {
        const own = editableRow(row, saved);
        const notSet = "notSet" in row && row.notSet === true;
        return {
          id: row.id,
          name: row.name,
          // A saved row shows its amount as typed; a linked line its monthly figure, or Not set.
          amount: notSet ? null : own ? own.amount : row.amount,
          frequency: own ? own.frequency : row.frequency,
          editable: own !== null,
          note:
            "linked" in row && row.linked
              ? linkedSourceText(
                  page.categories.flatMap((c) => c.entries).find((e) => e.entry.id === row.id)
                    ?.source ?? null,
                )
              : undefined,
        };
      }),
    }));
  }, [page, saved, customCategories, order]);
  return (
    <BudgetEditor
      sections={sections}
      onEdit={(id) => {
        const row = saved.get(id);
        if (row) onEdit(id, row);
      }}
      onAdd={onAdd}
      onOpenWebsite={onOpenWebsite}
      onFinish={onFinish}
    />
  );
}

/** Whether the phone asks for less motion: the sheet then appears without sliding. */
function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        if (live) setReduce(on);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/** The add and edit form in a native sheet, with the delete confirmation. */
function EntrySheet({
  sheet,
  offline,
  categories,
  onClose,
  onDone,
}: {
  sheet: Sheet;
  /** The connection dropped: the form stays with what was typed, and nothing is sent. */
  offline: boolean;
  categories: readonly string[];
  onClose(): void;
  onDone(message: string): void;
}) {
  const writes = useBudgetWrites();
  const reduceMotion = useReduceMotion();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  // A new sheet starts with no error.
  const sheetKey = sheet ? (sheet.mode === "add" ? `add-${sheet.requestKey}` : sheet.id) : "";
  useEffect(() => {
    setError(null);
    setConfirming(false);
  }, [sheetKey]);

  const finish = (result: BudgetWriteResult, failed: string, message: string) => {
    setSaving(false);
    if (result === "saved") onDone(message);
    else setError(result === "conflict" ? EDITOR.conflict : failed);
  };

  const sheetScroll = useRef<ScrollViewInstance>(null);
  const lastAdd = useRef<{ sheet: string; body: string; key: string } | null>(null);
  const save = async (values: ValidEntryValues) => {
    if (!sheet || offline) return;
    setSaving(true);
    setError(null);
    const isIncome = values.category === "income";
    if (sheet.mode === "add") {
      const entry = {
        category: values.category,
        name: values.name,
        amount: values.amount,
        frequency: values.frequency,
        isIncome,
        isEssential: isIncome ? true : values.isEssential,
        ownership: "sole" as const,
      };
      // The same entry tried again keeps its key, so an add that landed but timed out is not made
      // twice; a changed entry is a new add with a new key (the backend refuses a key reused for a
      // different body, 422 idempotency_key_reused).
      const body = JSON.stringify(entry);
      const last = lastAdd.current;
      const key =
        last?.sheet !== sheetKey
          ? sheet.requestKey
          : last.body === body
            ? last.key
            : Crypto.randomUUID();
      lastAdd.current = { sheet: sheetKey, body, key };
      const result = await writes.add(entry, key);
      finish(result, EDITOR.addFailed, EDITOR.saved);
      return;
    }
    // Moving into or out of the income category changes what an entry is, as web's add sets it.
    // An income entry saved in another category stays income when moved between spending ones.
    const wasIncome = sheet.row.isIncome === true;
    const stillIncome =
      values.category === "income" || (sheet.row.category !== "income" && wasIncome);
    const result = await writes.update(sheet.id, {
      name: values.name,
      amount: values.amount,
      frequency: values.frequency,
      category: values.category,
      isEssential: stillIncome ? true : values.isEssential,
      ...(stillIncome !== wasIncome ? { isIncome: stillIncome } : {}),
    });
    finish(result, EDITOR.saveFailed, EDITOR.saved);
  };

  const remove = async () => {
    if (sheet?.mode !== "edit" || offline) return;
    setConfirming(false);
    setSaving(true);
    setError(null);
    const result = await writes.remove(sheet.id);
    finish(result, EDITOR.deleteFailed, EDITOR.deleted);
  };

  const initial: EntryValues | null = !sheet
    ? null
    : sheet.mode === "add"
      ? {
          name: "",
          amount: null,
          frequency: "monthly",
          category: sheet.category,
          isEssential: defaultEssential(sheet.category),
        }
      : {
          name: sheet.row.name ?? "",
          amount: sheet.row.amount,
          frequency: sheet.row.frequency,
          category: sheet.row.category,
          isEssential: sheet.row.isEssential === true,
        };

  return (
    <Modal
      visible={sheet !== null}
      animationType={reduceMotion ? "none" : "slide"}
      presentationStyle="pageSheet"
      onRequestClose={saving ? undefined : onClose}
    >
      {sheet && initial ? (
        <Screen testID="budget-entry-sheet" keyboardAware scrollRef={sheetScroll}>
          <BudgetEntryForm
            key={sheetKey}
            mode={sheet.mode}
            initial={initial}
            categories={categories}
            saving={saving}
            error={error}
            offline={offline}
            onSave={(values) => void save(values)}
            onTry={() => setError(null)}
            checkAmount={budgetAmountProblem}
            onInvalid={() => sheetScroll.current?.scrollTo({ y: 0, animated: false })}
            onCancel={onClose}
            onDelete={() => setConfirming(true)}
          />
          {sheet.mode === "edit" ? (
            <ConfirmDialog
              visible={confirming}
              title={deleteTitle(sheet.row.name ?? "")}
              message={deleteMessage(sheet.row.name ?? "", sheet.row.amount, sheet.row.frequency)}
              confirmLabel={EDITOR.deleteEntry}
              onConfirm={() => void remove()}
              onCancel={() => setConfirming(false)}
            />
          ) : null}
        </Screen>
      ) : null}
    </Modal>
  );
}

/**
 * The account forms' one check of a typed amount (a minus, text it cannot read, over the contract's
 * limit) in their words, for the budget entry form: the same rule and wording, not a copy.
 */
function budgetAmountProblem(value: number | null, text: string): string | null {
  const problem = amountProblem(value, text);
  return problem ? amountProblemMessage(problem, false) : null;
}

/** Web's `RunwayCalculator`: the what-if zone under the saved figure. Nothing in it is sent. */
function Runway({ page }: { page: BudgetPageState }) {
  const setup = page.runway;
  const [inputs, setInputs] = useState<RunwayScenarioInputs>({});
  const [lump, setLump] = useState<number | null>(null);
  const [cut, setCut] = useState<number | null>(null);
  const scenario: RunwayScenarioInputs = {
    ...inputs,
    severanceLump: lump ?? undefined,
    extraMonthlyCut: cut ?? undefined,
  };
  // The engine's illustration from the saved figure's own two numbers and what changed.
  const outcome = runwayIllustration(setup, scenario);
  const wording = outcome.months === null ? null : describeBreathingRoom(outcome.months);
  const emptyLabel = setup.saved ? RUNWAY.noEndDate : RUNWAY.notSet;
  const cover = outcome.months === null ? emptyLabel : breathingRoomPhrase(outcome.months);
  const included = { ...setup.defaultAccounts, ...(inputs.includedAccounts ?? {}) };
  const kept = { ...setup.defaultIncome, ...(inputs.keptIncome ?? {}) };
  const figure = wording ? `${wording.leadIn} ${wording.figure}` : emptyLabel;

  const reset = () => {
    setInputs({});
    setLump(null);
    setCut(null);
  };

  return (
    <ScenarioZone
      title={RUNWAY.title}
      collapsible
      showLabel={RUNWAY.show}
      basis={setup.saved ? RUNWAY.basisSaved : RUNWAY.basisUnsaved}
      summary={
        outcome.isModified
          ? runwaySummaryModified(cover)
          : setup.saved
            ? runwaySummarySaved(setup.saved.liquidCash, setup.saved.monthlyEssentials)
            : RUNWAY.summaryUnsaved
      }
      isModified={outcome.isModified}
      onReset={reset}
      announcement={outcome.isModified ? runwayAnnouncement(cover) : ""}
      testID="runway"
      result={
        <View accessible accessibilityLabel={runwayResultSpoken(figure, outcome.pool)}>
          <Text textStyle="label.md" color="secondary">
            {RUNWAY.result}
          </Text>
          <Text textStyle="heading.md" tabular testID="runway-outcome">
            {figure}
          </Text>
          <Text textStyle="body.sm" color="secondary">
            {BREATHING_ROOM.moneyToDrawOn}
          </Text>
          <Text textStyle="body.sm" tabular testID="runway-pool">
            {optionHint(outcome.pool, false)}
          </Text>
        </View>
      }
      extra={
        <CollapsibleDrawer
          label={RUNWAY.options}
          openLabel={RUNWAY.options}
          testID="runway-options"
        >
          {setup.poolAccounts.length > 0 ? (
            <View>
              <Text textStyle="label.md">{RUNWAY.accounts}</Text>
              {setup.poolAccounts.map(({ account, balance }) => (
                <Switch
                  key={account.id}
                  label={account.name}
                  hint={optionHint(balance, false)}
                  value={included[account.id] === true}
                  testID={`runway-account-${account.id}`}
                  onValueChange={(next) =>
                    setInputs((was) => ({
                      ...was,
                      includedAccounts: { ...(was.includedAccounts ?? {}), [account.id]: next },
                    }))
                  }
                />
              ))}
            </View>
          ) : null}
          {setup.otherIncome.length > 0 ? (
            <View>
              <Text textStyle="label.md">{RUNWAY.income}</Text>
              {setup.otherIncome.map(({ entry, monthly }) => (
                <Switch
                  key={entry.id}
                  label={entry.name}
                  hint={optionHint(monthly, true)}
                  value={kept[entry.id] === true}
                  testID={`runway-income-${entry.id}`}
                  onValueChange={(next) =>
                    setInputs((was) => ({
                      ...was,
                      keptIncome: { ...(was.keptIncome ?? {}), [entry.id]: next },
                    }))
                  }
                />
              ))}
            </View>
          ) : null}
        </CollapsibleDrawer>
      }
    >
      <FormField label={RUNWAY.lump} hint={RUNWAY.lumpHint}>
        <CurrencyInput
          value={lump}
          onValueChange={(v) => setLump(v === null ? null : clampRunwayLump(v))}
          accessibilityLabel={RUNWAY.lump}
          accessibilityHint={RUNWAY.lumpHint}
          testID="runway-lump"
        />
      </FormField>
      <FormField label={RUNWAY.cut}>
        <CurrencyInput
          value={cut}
          onValueChange={(v) => setCut(v === null ? null : clampRunwayCut(v))}
          accessibilityLabel={RUNWAY.cut}
          testID="runway-cut"
        />
      </FormField>
    </ScenarioZone>
  );
}
