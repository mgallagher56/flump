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
import { INCOME_CATEGORY as INCOME, isIncomeEntry } from "../../income";
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

/** A safe id fragment from a category name (custom names may hold spaces or symbols). */
const categorySlug = (category: string) =>
  category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "category";

/** An example for each section's add row, so the empty name field says what goes in it. */
const NAME_EXAMPLES: Record<string, string> = {
  income: "For example, Child Benefit",
  housing: "For example, Rent",
  bills: "For example, Water",
  expenses: "For example, Gym",
  savings: "For example, Holiday fund",
};

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
    if (next === null) {
      // A cleared amount is not a change: show the saved amount again and save nothing.
      amountRef.current = toAmount(entry.amount);
      setAmount(toAmount(entry.amount));
      return;
    }
    if (next === toAmount(entry.amount)) return;
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
        {/* Savings count as savings whatever the flag, so only spending rows offer it. */}
        {isIncomeEntry(entry) || entry.category === "savings" ? (
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
        aria-label={`Delete ${entry.name}`}
        data-testid={`budget-editor-remove-${entry.id}`}
        id={`budget-editor-remove-${entry.id}`}
        size="sm"
        title={`Delete ${entry.name}`}
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
  /** The id fragment for this section's controls. */
  slug: string;
  label: string;
  onAdd: (name: string, amount: number) => Promise<boolean>;
}

/**
 * The add row that closes each section: a quiet "Add to …" button that opens a name and amount
 * row in place, so the editor does not show an empty form under every section.
 */
const AddEntryRow: FC<AddEntryRowProps> = ({ category, slug, label, onAdd }) => {
  const [open, setOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  // Set when the row closes from an Add or a Cancel, so focus goes back to the opener (UX A3).
  const returnFocus = useRef(false);
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
    if (added) close();
  };

  const close = () => {
    returnFocus.current = true;
    setName("");
    setAmount(null);
    setOpen(false);
  };

  useEffect(() => {
    if (open) {
      nameRef.current?.focus();
    } else if (returnFocus.current) {
      returnFocus.current = false;
      openerRef.current?.focus();
    }
  }, [open]);

  if (!open) {
    return (
      <div>
        <Button
          ref={openerRef}
          data-testid={`budget-editor-open-add-${slug}`}
          id={`budget-editor-open-add-${slug}`}
          size="sm"
          variant="ghost"
          onClick={() => setOpen(true)}
        >
          <Icon icon={Plus} size="sm" />
          {category === INCOME ? "Add income" : `Add to ${label.toLowerCase()}`}
        </Button>
      </div>
    );
  }

  return (
    <form className={addRow()} onSubmit={submit}>
      <TextInput
        ref={nameRef}
        aria-label={`New entry name in ${label}`}
        data-testid={`budget-editor-new-name-${slug}`}
        id={`budget-editor-new-name-${slug}`}
        placeholder={NAME_EXAMPLES[category] ?? "Name"}
        size="sm"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <div className={addAmount()}>
        <CurrencyInput
          aria-label={`New entry amount in ${label}`}
          data-testid={`budget-editor-new-amount-${slug}`}
          id={`budget-editor-new-amount-${slug}`}
          size="sm"
          value={amount}
          onValueChange={setAmount}
        />
      </div>
      <Button
        aria-label={`Add to ${label}`}
        data-testid={`budget-editor-add-${slug}`}
        disabled={!name.trim() || adding}
        id={`budget-editor-add-${slug}`}
        size="sm"
        type="submit"
        variant="outline"
      >
        <Icon icon={Plus} size="sm" />
        {adding ? "Adding…" : "Add"}
      </Button>
      <Button
        data-testid={`budget-editor-cancel-add-${slug}`}
        id={`budget-editor-cancel-add-${slug}`}
        size="sm"
        variant="ghost"
        onClick={close}
      >
        Cancel
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
  const toastApi = useOptionalToast();
  const { formatCurrency } = useFormatCurrency();
  // One save message at a time: each new one replaces the last, so toasts never pile up.
  const lastToast = useRef<string | null>(null);
  const toast = toastApi
    ? {
        toast: (options: { title: string }) => {
          if (lastToast.current) toastApi.dismiss(lastToast.current);
          lastToast.current = toastApi.toast(options);
        },
      }
    : null;
  const [toRemove, setToRemove] = useState<BudgetEntry | null>(null);
  const [removing, setRemoving] = useState(false);
  // Where focus goes once a deleted row has gone (UX A3): the next row's name, else the heading.
  const pendingFocus = useRef<string | null>(null);
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

  /** The next row's name field in the deleted entry's section, else that section's heading. */
  const focusTargetAfterDelete = (entry: BudgetEntry) => {
    const category = isIncomeEntry(entry) ? INCOME : entry.category;
    const rows = entriesFor(category);
    const index = rows.findIndex((e) => e.id === entry.id);
    const next = rows[index + 1] ?? rows[index - 1];
    return next
      ? `budget-editor-name-${next.id}`
      : `budget-editor-section-${categorySlug(category)}`;
  };

  // Runs after every render until the target is on the page, so it lands once the row has gone
  // and the dialog has let go of focus.
  useEffect(() => {
    const id = pendingFocus.current;
    if (!id || toRemove) return;
    const target = document.getElementById(id);
    if (target) {
      pendingFocus.current = null;
      target.focus();
    }
  });

  const confirmRemove = async () => {
    if (!toRemove) return;
    const target = focusTargetAfterDelete(toRemove);
    setRemoving(true);
    let removed = false;
    try {
      removed = (await onDelete(toRemove.id)) !== false;
    } catch {
      removed = false;
    }
    if (removed) pendingFocus.current = target;
    setRemoving(false);
    setToRemove(null);
    if (removed) toast?.toast({ title: "Entry deleted" });
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
          const slug = categorySlug(category);
          const headingId = `budget-editor-section-${slug}`;
          // Income entries in a custom category show under Money in but still belong to it.
          const isEmpty = !entries.some((e) => e.category === category);
          return (
            <section aria-labelledby={headingId} className={section.root} key={category}>
              <div className={section.headingRow}>
                <h3 className={section.heading} id={headingId} tabIndex={-1}>
                  {label}
                </h3>
                {onDeleteCategory && removableCategories.includes(category) && isEmpty ? (
                  <Button
                    data-testid={`budget-editor-remove-category-${slug}`}
                    id={`budget-editor-remove-category-${slug}`}
                    size="sm"
                    variant="ghost"
                    onClick={() => onDeleteCategory(category)}
                  >
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
                <p className={section.empty}>No entries added</p>
              )}
              <AddEntryRow category={category} label={label} slug={slug} onAdd={add(category)} />
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
              <span className={figure()}>
                {formatCurrency(toAmount(toRemove.amount), { maximumFractionDigits: 0 })}
              </span>{" "}
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
