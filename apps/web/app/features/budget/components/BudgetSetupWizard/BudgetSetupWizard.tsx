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
import { type FC, useState } from "react";
import { Link } from "react-router";
import { ConfirmDialog } from "~/features/feedback/components/ConfirmDialog";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { BudgetCategory, BudgetEntry } from "~/types/budget";
import { toMonthly } from "~/types/budget";
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
  defaults: "Start with example figures",
  income: "Income",
  housing: "Housing",
  bills: "Bills",
  expenses: "Expenses",
  savings: "Savings",
  summary: "Your budget at a glance",
};

const STEP_DESCRIPTIONS: Record<WizardStep, string> = {
  welcome: "Set up your monthly budget to see where your money goes and your months of cover.",
  defaults: "Start from example figures, or from a blank budget.",
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
  "Check any example figures and change them to match yours",
  "See what is left over each month",
  "See your months of cover",
];

type NewEntry = Omit<BudgetEntry, "id" | "userId" | "createdAt" | "updatedAt">;

const defaultItem = (
  name: string,
  amount: number,
  category: string,
  isEssential: boolean,
): NewEntry => ({
  name,
  amount,
  category,
  frequency: "monthly",
  isIncome: false,
  isPrimaryIncome: false,
  isEssential,
  notes: null,
  isDefault: true,
});

// Suggested rows are names only: the amount starts at 0 for the person to fill in, so no
// invented figure reaches budget totals, safe to spend or months of cover (E23).
const DEFAULT_ITEMS: NewEntry[] = [
  defaultItem("Rent / Mortgage", 0, "housing", true),
  defaultItem("Council Tax", 0, "bills", true),
  defaultItem("Gas & Electricity", 0, "bills", true),
  defaultItem("Water", 0, "bills", true),
  defaultItem("Broadband", 0, "bills", false),
  defaultItem("Groceries", 0, "expenses", true),
];

export const BudgetSetupWizard: FC<BudgetSetupWizardProps> = ({
  entries,
  onUpdateEntry,
  onAddEntry,
  onDeleteEntry,
  onComplete,
  onCancel,
  monthlyTakeHome,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const [currentStep, setCurrentStep] = useState<WizardStep>("welcome");
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

  const stepIndex = STEPS.indexOf(currentStep);
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
      const next = STEPS[stepIndex + 1];
      if (next) setCurrentStep(next);
    } catch (err) {
      console.error("Failed to save budget entries during wizard step:", err);
      // Advance even if saving failed so the wizard is not stuck.
      const next = STEPS[stepIndex + 1];
      if (next) setCurrentStep(next);
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    resetAddForm();
    const prev = STEPS[stepIndex - 1];
    if (prev) setCurrentStep(prev);
  };

  const applyDefaults = async () => {
    setSaving(true);
    try {
      for (const item of DEFAULT_ITEMS) {
        await onAddEntry(item);
      }
      saveAllAndProceed();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const allEffective = entries.map(getEffectiveEntry);
  const totalIncome = allEffective.filter((e) => e.isIncome).reduce((s, e) => s + toMonthly(e), 0);
  const totalExpenses = allEffective
    .filter((e) => !e.isIncome)
    .reduce((s, e) => s + toMonthly(e), 0);
  const surplus = totalIncome - totalExpenses;

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
            setNewIsEssential(currentStep !== "expenses");
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

  const incomeEntries = getCategoryEntries("income");

  return (
    <div className={wizardRoot()}>
      <ProgressBar
        label="Budget setup"
        valueDisplay={`Step ${stepIndex + 1} of ${STEPS.length}`}
        value={stepIndex}
        max={STEPS.length - 1}
        height={6}
      />
      <ol aria-label="Setup steps" className={stepList()}>
        {STEPS.filter((s) => s !== "welcome").map((step, i) => {
          const actualIndex = i + 1;
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
            <h2 className={stepTitle()}>{STEP_TITLES[currentStep]}</h2>
            <p className={stepDescription()}>{STEP_DESCRIPTIONS[currentStep]}</p>
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

          {currentStep === "defaults" && (
            <div className={choiceGrid()}>
              <div className={choiceCard({ featured: true })}>
                <div>
                  <h3 className={choiceTitle()}>Example figures</h3>
                  <p className={choiceText()}>
                    Example: rent or mortgage £1,200, council tax £160, gas and electricity £150,
                    water £40, broadband £35 and groceries £350 a month. These are examples, not
                    your figures. You can change each one in the next steps.
                  </p>
                </div>
                <Button disabled={saving} type="button" onClick={applyDefaults}>
                  <Icon icon={Rocket} size="sm" />
                  {saving ? "Adding…" : "Use example figures"}
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
                <div className={callout()}>
                  <p className={calloutText()}>
                    Estimate from your saved details:{" "}
                    <strong>{formatCurrency(Math.abs(monthlyTakeHome))}</strong> take-home pay a
                    month. Select "Use {formatCurrency(Math.abs(monthlyTakeHome))}" to copy it into
                    the salary entry below.
                  </p>
                  {incomeEntries.length > 0 && (
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const primary =
                          incomeEntries.find((e) => e.isPrimaryIncome) ?? incomeEntries[0];
                        if (primary) {
                          localUpdate(primary.id, {
                            amount: monthlyTakeHome,
                            frequency: "monthly",
                          });
                        }
                      }}
                    >
                      Use {formatCurrency(Math.abs(monthlyTakeHome))}
                    </Button>
                  )}
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
                <span>{surplus >= 0 ? "Left over each month" : "Short each month"}</span>
                <span>
                  <Money size="lg" value={Math.abs(surplus)} /> a month
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
                Finish setup
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
