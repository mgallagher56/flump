import { defaultIsEssential } from "@flump/finance-engine";
import {
  Button,
  Card,
  CurrencyInput,
  FormField,
  Icon,
  Money,
  ProgressBar,
  TextInput,
} from "@repo/ui";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  PiggyBank,
  Plus,
  Rocket,
} from "lucide-react";
import { type FC, useRef, useState } from "react";
import { Link } from "react-router";
import { ConfirmDialog } from "~/features/feedback/components/ConfirmDialog";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { BudgetCategory, BudgetEntry } from "~/types/budget";
import { toMonthly } from "~/types/budget";
import { missingWizardCommonItems, WIZARD_COMMON_ITEMS } from "../../wizardCommonItems";
import { WizardEntryRow } from "../WizardEntryRow";
import {
  addActions,
  addPanel,
  addRow,
  callout,
  calloutText,
  checkbox,
  checkboxLabel,
  choiceCard,
  choiceGrid,
  choiceText,
  choiceTitle,
  emptyNote,
  entryList,
  navRight,
  navRow,
  pointIcon,
  pointList,
  pointRow,
  stepBody,
  stepDescription,
  stepItem,
  stepList,
  stepTitle,
  summaryNote,
  summaryRow,
  summaryRows,
  tipBox,
  tipLink,
  wizardRoot,
} from "./BudgetSetupWizard.styles";

export interface BudgetSetupWizardProps {
  entries: BudgetEntry[];
  onUpdateEntry: (id: string, update: Partial<BudgetEntry>) => Promise<void>;
  onAddEntry: (
    entry: Omit<BudgetEntry, "id" | "userId" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  onComplete: () => void;
  onCancel: () => void;
  /** Pre-filled monthly take-home from user profile */
  monthlyTakeHome: number | null;
  /**
   * The saved housing payment a housing entry the person linked reads, a month at their share,
   * or null when none is saved (that entry is then "Not set" and the totals are unknown).
   */
  linkedHousingMonthly?: number | null;
  /**
   * "setup" (the default) is the first run: welcome, example figures, then each section. "edit"
   * changes a saved budget: it starts at Income with the saved entries and skips the first two.
   * "add" adds common entries to a budget that already has some (after onboarding, say): it skips
   * the welcome, offers only the common entries the budget does not have, keeps every saved entry
   * as it is, then goes through each section.
   */
  mode?: "setup" | "edit" | "add";
}

type WizardStep =
  | "welcome"
  | "defaults"
  | "income"
  | "housing"
  | "bills"
  | "expenses"
  | "savings"
  | "summary";
const STEPS: WizardStep[] = [
  "welcome",
  "defaults",
  "income",
  "housing",
  "bills",
  "expenses",
  "savings",
  "summary",
];

/** Editing a saved budget skips the welcome and the example figures. */
const EDIT_STEPS: WizardStep[] = STEPS.filter((step) => step !== "welcome" && step !== "defaults");

/** Adding to a saved budget skips the welcome and starts at the common entries. */
const ADD_STEPS: WizardStep[] = STEPS.filter((step) => step !== "welcome");

const ADD_TITLE = "Add common budget items";
const ADD_DESCRIPTION =
  "Add the common items your budget does not have yet. Your saved entries stay as they are.";

const STEP_LABELS: Record<WizardStep, string> = {
  welcome: "Welcome",
  defaults: "Defaults",
  income: "Income",
  housing: "Housing",
  bills: "Bills",
  expenses: "Expenses",
  savings: "Savings",
  summary: "Summary",
};

const STEP_TITLES: Record<WizardStep, string> = {
  welcome: "Set up your budget",
  defaults: "Start with common entries",
  income: "Income",
  housing: "Housing",
  bills: "Bills",
  expenses: "Expenses",
  savings: "Savings",
  summary: "Your budget at a glance",
};

const STEP_DESCRIPTIONS: Record<WizardStep, string> = {
  welcome: "Set up your monthly budget to see where your money goes and your breathing room.",
  defaults: "Start from common entries, or from a blank budget.",
  income: "Enter your take-home pay and any other income sources.",
  housing: "Rent, mortgage, insurance and other home costs.",
  bills: "Gas, electricity, water, council tax and broadband.",
  expenses: "Subscriptions, phone, gym and everyday costs.",
  savings: "How much you set aside each month.",
  summary: "Review your budget before finishing.",
};

const ADD_PLACEHOLDERS: Partial<Record<WizardStep, string>> = {
  income: "For example, freelance work",
  housing: "For example, service charge",
  bills: "For example, TV licence",
  savings: "For example, holiday fund",
  expenses: "For example, gym",
};

const WELCOME_POINTS = [
  "Enter your income and monthly spending",
  "Fill in the amounts for any common entries you add",
  "See what is left over each month",
  "See your breathing room",
];

export const BudgetSetupWizard: FC<BudgetSetupWizardProps> = ({
  entries,
  onUpdateEntry,
  onAddEntry,
  onDeleteEntry,
  onComplete,
  onCancel,
  monthlyTakeHome,
  linkedHousingMonthly = null,
  mode = "setup",
}) => {
  const { formatCurrency } = useFormatCurrency();
  const isEdit = mode === "edit";
  const isAdd = mode === "add";
  const steps = isEdit ? EDIT_STEPS : isAdd ? ADD_STEPS : STEPS;
  const [currentStep, setCurrentStep] = useState<WizardStep>(steps[0] ?? "welcome");
  const [localUpdates, setLocalUpdates] = useState<Record<string, Partial<BudgetEntry>>>({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState<number | null>(null);
  const [newIsEssential, setNewIsEssential] = useState(true);
  const [adding, setAdding] = useState(false);

  const resetAddForm = () => {
    setIsAdding(false);
    setNewName("");
    setNewAmount(null);
    setNewIsEssential(true);
  };

  const handleAddItem = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const isIncome = currentStep === "income";
      await onAddEntry({
        category: currentStep as BudgetCategory,
        name: newName.trim(),
        amount: newAmount ?? 0,
        frequency: "monthly",
        isIncome,
        isPrimaryIncome: false,
        isEssential: isIncome ? true : newIsEssential,
        notes: null,
        isDefault: false,
      });
      resetAddForm();
    } catch (err) {
      console.error("Failed to add entry in wizard:", err);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteEntry(id);
      setLocalUpdates((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      console.error("Failed to delete entry in wizard:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const pendingDeleteEntry = pendingDeleteId
    ? entries.find((entry) => entry.id === pendingDeleteId)
    : undefined;

  const stepIndex = steps.indexOf(currentStep);
  const isFirst = stepIndex === 0;
  const isLast = currentStep === "summary";

  const localUpdate = (id: string, update: Partial<BudgetEntry>) => {
    setLocalUpdates((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...update } }));
  };

  const getEffectiveEntry = (entry: BudgetEntry): BudgetEntry => ({
    ...entry,
    ...(localUpdates[entry.id] ?? {}),
  });

  const getCategoryEntries = (cat: BudgetEntry["category"]) =>
    entries.filter((e) => e.category === cat).map(getEffectiveEntry);

  const saveAllAndProceed = async () => {
    resetAddForm();
    setSaving(true);
    try {
      const updateEntries = Object.entries(localUpdates);
      if (updateEntries.length > 0) {
        await Promise.all(updateEntries.map(([id, update]) => onUpdateEntry(id, update)));
        setLocalUpdates({});
      }
      const next = steps[stepIndex + 1];
      if (next) setCurrentStep(next);
    } catch (err) {
      console.error("Failed to save budget entries during wizard step:", err);
      // Advance even if saving failed so the wizard is not stuck.
      const next = steps[stepIndex + 1];
      if (next) setCurrentStep(next);
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    resetAddForm();
    const prev = steps[stepIndex - 1];
    if (prev) setCurrentStep(prev);
  };

  // Idempotent: a common entry the budget already has, under the same or a synonym name (from an
  // earlier click, old seed rows, or the page's "Add common entries"), is never added again. The
  // ref, not the `saving` state captured by this render, stops a double click adding twice.
  const applyingDefaults = useRef(false);
  const applyDefaults = async () => {
    if (applyingDefaults.current) return;
    applyingDefaults.current = true;
    setSaving(true);
    try {
      for (const item of missingWizardCommonItems(entries)) {
        await onAddEntry(item.entry);
      }
      saveAllAndProceed();
    } catch (err) {
      console.error(err);
    } finally {
      applyingDefaults.current = false;
      setSaving(false);
    }
  };

  const allEffective = entries.map(getEffectiveEntry);
  // A linked entry's stored amount is never read (decision 1): it reads the saved take-home or
  // housing payment, and while that is not set the totals are unknown, never short by it.
  const ownMonthly = (e: BudgetEntry): number => (e.linkKind ? 0 : toMonthly(e));
  // The take-home the budget reads from the profile (item 7): in place of an income entry the
  // person chose to replace with it, or while no income entry has an amount. Names decide nothing.
  const takeHomeChosen = allEffective.some((e) => e.isIncome && e.linkKind === "take_home");
  const housingChosen = allEffective.some((e) => !e.isIncome && e.linkKind === "housing");
  const ownIncome = allEffective.some((e) => e.isIncome && ownMonthly(e) > 0);
  const linkedTakeHome = monthlyTakeHome && (takeHomeChosen || !ownIncome) ? monthlyTakeHome : null;
  const linkNotSet =
    (takeHomeChosen && !monthlyTakeHome) || (housingChosen && linkedHousingMonthly === null);
  const totalIncome = linkNotSet
    ? null
    : allEffective.filter((e) => e.isIncome).reduce((s, e) => s + ownMonthly(e), 0) +
      (linkedTakeHome ?? 0);
  const totalExpenses = linkNotSet
    ? null
    : allEffective.filter((e) => !e.isIncome).reduce((s, e) => s + ownMonthly(e), 0) +
      (housingChosen ? (linkedHousingMonthly ?? 0) : 0);
  const surplus =
    totalIncome === null || totalExpenses === null ? null : totalIncome - totalExpenses;

  const stepLabel = STEP_LABELS[currentStep];

  const renderAddSection = () => {
    if (!isAdding) {
      return (
        <Button
          variant="outline"
          onClick={() => {
            setIsAdding(true);
            setNewName("");
            setNewAmount(null);
            // Everyday expenses and savings start not essential (owner item 28).
            setNewIsEssential(currentStep !== "expenses" && defaultIsEssential(currentStep));
          }}
        >
          <Icon icon={Plus} size="sm" />
          Add {stepLabel.toLowerCase()} entry
        </Button>
      );
    }
    return (
      <div className={addPanel()}>
        <div className={addRow()}>
          <FormField label="Name">
            {(field) => (
              <TextInput
                id={field.id}
                placeholder={ADD_PLACEHOLDERS[currentStep]}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddItem();
                  if (e.key === "Escape") resetAddForm();
                }}
              />
            )}
          </FormField>
          <FormField label="Amount a month">
            {(field) => (
              <CurrencyInput
                id={field.id}
                placeholder="0"
                value={newAmount}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddItem();
                  if (e.key === "Escape") resetAddForm();
                }}
                onValueChange={setNewAmount}
              />
            )}
          </FormField>
        </div>
        {currentStep !== "income" && (
          <label className={checkboxLabel()}>
            <input
              checked={newIsEssential}
              className={checkbox()}
              id="budget-essential-expense-checkbox"
              type="checkbox"
              onChange={(e) => setNewIsEssential(e.target.checked)}
            />
            Essential spending. Untick for flexible spending.
          </label>
        )}
        <div className={addActions()}>
          <Button disabled={adding} type="button" variant="ghost" onClick={resetAddForm}>
            Cancel
          </Button>
          <Button disabled={adding || !newName.trim()} type="button" onClick={handleAddItem}>
            {adding ? "Adding…" : "Add entry"}
          </Button>
        </div>
      </div>
    );
  };

  const renderEntries = (category: string, emptyText: string) => {
    const rows = getCategoryEntries(category);
    return (
      <div className={entryList()}>
        {rows.map((e) => (
          <WizardEntryRow
            key={e.id}
            deleting={deletingId === e.id}
            entry={e}
            onDelete={setPendingDeleteId}
            onUpdate={localUpdate}
          />
        ))}
        {rows.length === 0 && <p className={emptyNote()}>{emptyText}</p>}
      </div>
    );
  };

  const missingCommon = missingWizardCommonItems(entries);
  const headingTitle = isAdd && currentStep === "defaults" ? ADD_TITLE : STEP_TITLES[currentStep];
  const headingDescription =
    isAdd && currentStep === "defaults" ? ADD_DESCRIPTION : STEP_DESCRIPTIONS[currentStep];

  return (
    <div className={wizardRoot()}>
      <ProgressBar
        label={isEdit ? "Edit your budget" : isAdd ? ADD_TITLE : "Budget setup"}
        valueDisplay={`Step ${stepIndex + 1} of ${steps.length}`}
        value={stepIndex}
        max={steps.length - 1}
        height={6}
      />
      <ol aria-label="Budget steps" className={stepList()}>
        {steps
          .filter((s) => s !== "welcome")
          .map((step) => {
            const actualIndex = steps.indexOf(step);
            const state =
              currentStep === step ? "current" : stepIndex > actualIndex ? "done" : "todo";
            return (
              <li
                key={step}
                aria-current={state === "current" ? "step" : undefined}
                className={stepItem({ state })}
              >
                <Icon icon={state === "done" ? CheckCircle2 : Circle} size="sm" />
                {STEP_LABELS[step]}
              </li>
            );
          })}
      </ol>

      <Card padding="lg">
        <div className={stepBody()}>
          <div>
            <h2 className={stepTitle()}>{headingTitle}</h2>
            <p className={stepDescription()}>{headingDescription}</p>
          </div>

          {currentStep === "welcome" && (
            <ul className={pointList()}>
              {WELCOME_POINTS.map((point) => (
                <li key={point} className={pointRow()}>
                  <span className={pointIcon()}>
                    <Icon icon={Check} size="sm" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          )}

          {currentStep === "defaults" && isAdd && (
            <div className={choiceCard({ featured: true })}>
              <ul aria-label="Common budget items" className={pointList()}>
                {WIZARD_COMMON_ITEMS.map((item) => {
                  const has = !missingCommon.includes(item);
                  return (
                    <li key={item.label} className={pointRow()}>
                      <span className={pointIcon()}>
                        <Icon icon={has ? Check : Plus} size="sm" />
                      </span>
                      {item.label}
                      {has ? ": already in your budget" : ""}
                    </li>
                  );
                })}
              </ul>
              {missingCommon.length > 0 ? (
                <>
                  <p className={choiceText()}>
                    The amounts start empty for you to fill in. Select Next to go on without adding
                    them.
                  </p>
                  <Button disabled={saving} type="button" onClick={applyDefaults}>
                    <Icon icon={Plus} size="sm" />
                    {saving
                      ? "Adding…"
                      : `Add ${missingCommon.length === 1 ? "this item" : "these items"}`}
                  </Button>
                </>
              ) : (
                <p className={choiceText()}>Your budget already has all of these.</p>
              )}
            </div>
          )}

          {currentStep === "defaults" && !isAdd && (
            <div className={choiceGrid()}>
              <div className={choiceCard({ featured: true })}>
                <div>
                  <h3 className={choiceTitle()}>Common entries</h3>
                  <p className={choiceText()}>
                    Rent or mortgage, council tax, gas and electricity, water, broadband and
                    groceries, with the amounts left for you to fill in. You can change or remove
                    each one in the next steps.
                  </p>
                </div>
                <Button disabled={saving} type="button" onClick={applyDefaults}>
                  <Icon icon={Rocket} size="sm" />
                  {saving ? "Adding…" : "Add common entries"}
                </Button>
              </div>
              <div className={choiceCard()}>
                <div>
                  <h3 className={choiceTitle()}>Start from scratch</h3>
                  <p className={choiceText()}>
                    Begin with a blank budget and enter only what applies to you.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={saveAllAndProceed}>
                  Start blank
                </Button>
              </div>
            </div>
          )}

          {currentStep === "income" && (
            <div>
              {monthlyTakeHome ? (
                // One stored value (owner item 7): the profile's salary. The budget reads the
                // take-home worked out from it, so nothing is copied here.
                <div
                  className={callout()}
                  data-testid="wizard-linked-take-home"
                  id="wizard-linked-take-home"
                >
                  <p className={calloutText()}>
                    {linkedTakeHome !== null ? (
                      <>
                        Your take-home pay of{" "}
                        <strong>{formatCurrency(Math.abs(linkedTakeHome))}</strong> a month is
                        already in your budget, worked out from your salary in{" "}
                        <Link className={tipLink()} to="/app/profile">
                          Profile
                        </Link>
                        . If you add an income entry with an amount, your entries are used instead.
                      </>
                    ) : (
                      <>
                        Your own income entries are used in place of the take-home pay worked out
                        from your salary in{" "}
                        <Link className={tipLink()} to="/app/profile">
                          Profile
                        </Link>
                        . To use your take-home pay instead, choose it for an entry when you edit
                        your budget.
                      </>
                    )}
                  </p>
                </div>
              ) : null}
              {renderEntries("income", "No income yet. Add your salary or other earnings below.")}
              {renderAddSection()}
            </div>
          )}

          {(currentStep === "housing" ||
            currentStep === "bills" ||
            currentStep === "expenses" ||
            currentStep === "savings") && (
            <div>
              {renderEntries(currentStep, "Nothing here yet. Add an entry below.")}
              {renderAddSection()}
              {currentStep === "savings" && (
                <div className={tipBox()}>
                  <Icon icon={PiggyBank} size="md" />
                  <span>
                    Savings accounts, their interest rates and growth are on the{" "}
                    <Link className={tipLink()} to="/app/savings">
                      savings page
                    </Link>
                    .
                  </span>
                </div>
              )}
            </div>
          )}

          {currentStep === "summary" && (
            <div className={summaryRows()}>
              <div className={summaryRow()}>
                <span>Total income</span>
                <span>
                  <Money size="md" value={totalIncome} /> a month
                </span>
              </div>
              <div className={summaryRow()}>
                <span>Total spending</span>
                <span>
                  <Money size="md" value={totalExpenses} /> a month
                </span>
              </div>
              <div className={summaryRow()}>
                <span>
                  {surplus === null || surplus >= 0 ? "Left over each month" : "Short each month"}
                </span>
                <span>
                  <Money size="lg" value={surplus === null ? null : Math.abs(surplus)} /> a month
                </span>
              </div>
              <p className={summaryNote()}>
                You can edit each entry on the budget page. Your changes are saved as you move
                through each step.
              </p>
            </div>
          )}
        </div>
      </Card>

      <div className={navRow()}>
        <Button type="button" variant="outline" onClick={isFirst ? onCancel : goBack}>
          {isFirst ? (
            "Cancel"
          ) : (
            <>
              <Icon icon={ArrowLeft} size="sm" />
              Back
            </>
          )}
        </Button>
        <div className={navRight()}>
          <Button disabled={saving} type="button" onClick={isLast ? onComplete : saveAllAndProceed}>
            {saving ? (
              "Saving"
            ) : isLast ? (
              <>
                <Icon icon={CheckCircle2} size="sm" />
                {isAdd ? "Done" : isEdit ? "Finish editing" : "Finish setup"}
              </>
            ) : (
              <>
                Next
                <Icon icon={ArrowRight} size="sm" />
              </>
            )}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        scope="single"
        confirmLabel="Delete entry"
        description="This entry will be deleted from your budget. This cannot be undone."
        open={pendingDeleteEntry !== undefined}
        title={`Delete ${pendingDeleteEntry?.name ?? "entry"}?`}
        tone="danger"
        onConfirm={() => {
          if (!pendingDeleteId) return;
          const id = pendingDeleteId;
          setPendingDeleteId(null);
          void handleDeleteItem(id);
        }}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
      />
    </div>
  );
};
