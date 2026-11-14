import {
  Button,
  Card,
  ConfirmDialog,
  CurrencyInput,
  Icon,
  Select,
  Switch,
  TextInput,
  useOptionalToast,
} from "@repo/ui";
import { Plus, Trash2 } from "lucide-react";
import { type FC, type FormEvent, useEffect, useRef, useState } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { type BudgetEntry, getCategoryLabel } from "~/types/budget";
import {
  addAmount,
  addRow,
  amountField,
  budgetEditor,
  editorSection,
  entryRow,
  figure,
  frequencyField,
  rowControls,
} from "./BudgetEditor.styles";

export type NewBudgetEntry = Omit<BudgetEntry, "id" | "userId" | "createdAt" | "updatedAt">;

export interface BudgetEditorProps {
  /** Every saved entry. Income entries (category "income" or `isIncome`) show under "Money in". */
  entries: BudgetEntry[];
  /** The page's categories in order; "income" is shown first as "Money in" whatever its place. */
  categories: string[];
  /** Saves a new entry. Rejects on failure (the page shows the error). */
  onAdd: (entry: NewBudgetEntry) => Promise<void>;
  /** Saves a change to one entry. Rejects on failure (the page shows the error). */
  onUpdate: (id: string, update: Partial<BudgetEntry>) => Promise<void>;
  /** Deletes one entry. Resolves `false` (or rejects) when the delete failed. */
  onDelete: (id: string) => Promise<boolean | undefined>;
  /** Opens the add-category dialog. Shown as one button at the foot. */
  onAddCategory?: () => void;
  /** Removes a custom category. Offered only on custom categories with no entries left. */
  onDeleteCategory?: (category: string) => void;
  /** Categories that can be removed (the custom ones). */
  removableCategories?: string[];
}

const FREQUENCY_OPTIONS = [
  { value: "monthly", label: "a month" },
  { value: "annual", label: "a year" },
  { value: "weekly", label: "a week" },
] as const;

const INCOME = "income";

const isIncomeEntry = (entry: BudgetEntry) => entry.isIncome || entry.category === INCOME;

const sectionLabel = (category: string) =>
  category === INCOME ? "Money in" : getCategoryLabel(category);

const toAmount = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

interface EntryRowProps {
  entry: BudgetEntry;
  onSave: (id: string, update: Partial<BudgetEntry>) => Promise<boolean>;
  onRemove: (entry: BudgetEntry) => void;
}

/** One saved entry, editable where it sits. Text fields save on blur, choices save on change. */
const EntryRow: FC<EntryRowProps> = ({ entry, onSave, onRemove }) => {
  const [name, setName] = useState(entry.name);
  const [amount, setAmount] = useState<number | null>(toAmount(entry.amount));
  // The latest typed amount, read on blur after CurrencyInput's own rounding has run.
  const amountRef = useRef<number | null>(toAmount(entry.amount));

  // A saved change (or a reload after a conflict) shows the saved value. A failed save leaves the
  // entry as it was, so what was typed stays for another try.
  useEffect(() => setName(entry.name), [entry.name]);
  useEffect(() => {
    amountRef.current = toAmount(entry.amount);
    setAmount(toAmount(entry.amount));
  }, [entry.amount]);

  const saveName = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(entry.name);
      return;
    }
    if (trimmed !== entry.name) void onSave(entry.id, { name: trimmed });
  };

  const saveAmount = () => {
    const next = amountRef.current;
    if (next === null || next === toAmount(entry.amount)) return;
    void onSave(entry.id, { amount: next });
  };

  return (
    <li className={entryRow()} data-testid={`budget-editor-row-${entry.id}`}>
      <TextInput
        aria-label={`Name of ${entry.name}`}
        data-testid={`budget-editor-name-${entry.id}`}
        id={`budget-editor-name-${entry.id}`}
        size="sm"
        value={name}
        onBlur={saveName}
        onChange={(event) => setName(event.target.value)}
      />
      <div className={rowControls()}>
        <div className={amountField()}>
          <CurrencyInput
            aria-label={`Amount for ${entry.name}`}
            data-testid={`budget-editor-amount-${entry.id}`}
            id={`budget-editor-amount-${entry.id}`}
            size="sm"
            value={amount}
            onBlur={saveAmount}
            onValueChange={(value) => {
              amountRef.current = value;
              setAmount(value);
            }}
          />
        </div>
        <div className={frequencyField()}>
          <Select
            aria-label={`How often for ${entry.name}`}
            data-testid={`budget-editor-frequency-${entry.id}`}
            id={`budget-editor-frequency-${entry.id}`}
            options={FREQUENCY_OPTIONS}
            size="sm"
            value={entry.frequency}
            onChange={(event) =>
              void onSave(entry.id, {
                frequency: event.target.value as BudgetEntry["frequency"],
              })
            }
          />
        </div>
        {isIncomeEntry(entry) ? (
          <span />
        ) : (
          <Switch
            aria-label={`Essential: ${entry.name}`}
            checked={entry.isEssential}
            data-testid={`budget-editor-essential-${entry.id}`}
            id={`budget-editor-essential-${entry.id}`}
            label="Essential"
            onChange={(event) => void onSave(entry.id, { isEssential: event.target.checked })}
          />
        )}
      </div>
      <Button
        aria-label={`Remove ${entry.name}`}
        data-testid={`budget-editor-remove-${entry.id}`}
        id={`budget-editor-remove-${entry.id}`}
        size="sm"
        title={`Remove ${entry.name}`}
        variant="ghost"
        onClick={() => onRemove(entry)}
      >
        <Icon icon={Trash2} size="sm" />
      </Button>
    </li>
  );
};

interface AddEntryRowProps {
  category: string;
  label: string;
  onAdd: (name: string, amount: number) => Promise<boolean>;
}

/** The inline add row that closes each section. */
const AddEntryRow: FC<AddEntryRowProps> = ({ category, label, onAdd }) => {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    const added = await onAdd(trimmed, amount ?? 0);
    setAdding(false);
    // Keep what was typed when the save failed, so it can be tried again.
    if (added) {
      setName("");
      setAmount(null);
    }
  };

  return (
    <form className={addRow()} onSubmit={submit}>
      <TextInput
        aria-label={`New entry name in ${label}`}
        data-testid={`budget-editor-new-name-${category}`}
        id={`budget-editor-new-name-${category}`}
        placeholder="Name"
        size="sm"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <div className={addAmount()}>
        <CurrencyInput
          aria-label={`New entry amount in ${label}`}
          data-testid={`budget-editor-new-amount-${category}`}
          id={`budget-editor-new-amount-${category}`}
          size="sm"
          value={amount}
          onValueChange={setAmount}
        />
      </div>
      <Button
        aria-label={`Add to ${label}`}
        data-testid={`budget-editor-add-${category}`}
        disabled={!name.trim() || adding}
        id={`budget-editor-add-${category}`}
        size="sm"
        type="submit"
        variant="outline"
      >
        <Icon icon={Plus} size="sm" />
        {adding ? "Adding…" : "Add"}
      </Button>
    </form>
  );
};

/**
 * The budget page in edit mode (E16 round 3): every entry editable where it sits, added and
 * removed inline, each change saved as it is made with one quiet confirmation (E3). Removing asks
 * first, because deletes are permanent (U2, D1).
 */
export const BudgetEditor: FC<BudgetEditorProps> = ({
  entries,
  categories,
  onAdd,
  onUpdate,
  onDelete,
  onAddCategory,
  onDeleteCategory,
  removableCategories = [],
}) => {
  const toast = useOptionalToast();
  const { formatCurrencyDecimal } = useFormatCurrency();
  const [toRemove, setToRemove] = useState<BudgetEntry | null>(null);
  const [removing, setRemoving] = useState(false);
  const editor = budgetEditor();
  const section = editorSection();

  const sectionOrder = [INCOME, ...categories.filter((c) => c !== INCOME)];

  const entriesFor = (category: string) =>
    category === INCOME
      ? entries.filter(isIncomeEntry)
      : entries.filter((e) => e.category === category && !isIncomeEntry(e));

  const save = async (id: string, update: Partial<BudgetEntry>) => {
    try {
      await onUpdate(id, update);
      toast?.toast({ title: "Saved" });
      return true;
    } catch {
      // The page shows what went wrong; the field keeps what was typed.
      return false;
    }
  };

  const add = (category: string) => async (name: string, amount: number) => {
    const isIncome = category === INCOME;
    try {
      await onAdd({
        category,
        name,
        amount,
        frequency: "monthly",
        isIncome,
        isPrimaryIncome: false,
        // The wizard's defaults: spending is essential except everyday expenses.
        isEssential: isIncome ? true : category !== "expenses",
        notes: null,
        isDefault: false,
      });
      toast?.toast({ title: "Entry added" });
      return true;
    } catch {
      return false;
    }
  };

  const confirmRemove = async () => {
    if (!toRemove) return;
    setRemoving(true);
    let removed = false;
    try {
      removed = (await onDelete(toRemove.id)) !== false;
    } catch {
      removed = false;
    }
    setRemoving(false);
    setToRemove(null);
    if (removed) toast?.toast({ title: "Entry removed" });
  };

  return (
    <Card
      aria-labelledby="budget-editor-heading"
      as="section"
      data-testid="budget-editor"
      id="budget-editor"
      padding="lg"
    >
      <div className={editor.header}>
        <h2 className={editor.title} id="budget-editor-heading">
          Edit your budget
        </h2>
        <p className={editor.hint}>Changes save as you go.</p>
      </div>

      <div className={editor.sections}>
        {sectionOrder.map((category) => {
          const label = sectionLabel(category);
          const rows = entriesFor(category);
          const headingId = `budget-editor-section-${category}`;
          return (
            <section aria-labelledby={headingId} className={section.root} key={category}>
              <div className={section.headingRow}>
                <h3 className={section.heading} id={headingId}>
                  {label}
                </h3>
                {onDeleteCategory && removableCategories.includes(category) && rows.length === 0 ? (
                  <Button size="sm" variant="ghost" onClick={() => onDeleteCategory(category)}>
                    Remove {label.toLowerCase()}
                  </Button>
                ) : null}
              </div>
              {rows.length > 0 ? (
                <ul className={section.list}>
                  {rows.map((entry) => (
                    <EntryRow entry={entry} key={entry.id} onRemove={setToRemove} onSave={save} />
                  ))}
                </ul>
              ) : (
                <p className={section.empty}>Nothing here yet.</p>
              )}
              <AddEntryRow category={category} label={label} onAdd={add(category)} />
            </section>
          );
        })}
      </div>

      {onAddCategory ? (
        <div className={editor.foot}>
          <Button
            data-testid="budget-editor-add-category-btn"
            id="budget-editor-add-category-btn"
            size="sm"
            variant="outline"
            onClick={onAddCategory}
          >
            <Icon icon={Plus} size="sm" />
            Add category
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        confirmLabel="Delete entry"
        description={
          toRemove ? (
            <p>
              {toRemove.name},{" "}
              <span className={figure()}>{formatCurrencyDecimal(toAmount(toRemove.amount))}</span>{" "}
              {FREQUENCY_OPTIONS.find((o) => o.value === toRemove.frequency)?.label ?? "a month"},
              will be deleted from your budget. This cannot be undone.
            </p>
          ) : (
            ""
          )
        }
        id="budget-editor-confirm-remove"
        open={toRemove !== null}
        pending={removing}
        title={`Delete ${toRemove?.name ?? "entry"}?`}
        tone="danger"
        onConfirm={confirmRemove}
        onOpenChange={(open) => {
          if (!open) setToRemove(null);
        }}
      />
    </Card>
  );
};
