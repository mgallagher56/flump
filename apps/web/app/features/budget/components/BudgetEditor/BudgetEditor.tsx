import {
  Button,
  Card,
  ConfirmDialog,
  CurrencyInput,
  Icon,
  Select,
  StatusBadge,
  Switch,
  TextInput,
  useOptionalToast,
} from "@repo/ui";
import { Plus, Trash2 } from "lucide-react";
import { type FC, type FormEvent, useEffect, useRef, useState } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { type BudgetEntry, getCategoryLabel } from "~/types/budget";
import { type DraftBudgetEntry, isDraftReady } from "../../exampleDrafts";
import { INCOME_CATEGORY as INCOME, isIncomeEntry } from "../../income";
import { rankCategories } from "../BudgetCategoryList";
import {
  addActions,
  addAmount,
  addRow,
  amountField,
  budgetEditor,
  draftName,
  draftNote,
  editorSection,
  entryRow,
  essentialField,
  figure,
  frequencyField,
  removeCell,
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
  /**
   * Common entries held on the page and not saved. Each shows as an entry row with a "Common
   * entry" badge, under one labelled group that saves or removes them.
   */
  drafts?: DraftBudgetEntry[];
  /** Changes one example row on the page. Nothing is saved. */
  onDraftChange?: (id: string, update: Partial<DraftBudgetEntry>) => void;
  /** Removes one example row from the page, with no confirm: it was never saved. */
  onDraftRemove?: (id: string) => void;
  /**
   * Saves the drafts that have a name and an amount above £0. Rejects on failure (the page shows
   * the error and keeps the drafts not yet saved). The page moves focus once it resolves.
   */
  onSaveDrafts?: () => Promise<void>;
  /** Removes every common entry not yet saved. */
  onRemoveDrafts?: () => void;
  /** Exits edit mode. Shown as a "Finished editing" button at the foot of the editor. */
  onFinishEditing?: () => void;
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
        {/* Only income rows have no Essential switch; savings and spending rows both offer it. */}
        <div className={essentialField()}>
          {isIncomeEntry(entry) ? null : (
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
      </div>
      <Button
        aria-label={`Delete ${entry.name}`}
        className={removeCell()}
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

interface DraftRowProps {
  draft: DraftBudgetEntry;
  onChange: (id: string, update: Partial<DraftBudgetEntry>) => void;
  onRemove: (id: string) => void;
  /** True while the drafts are saving: every control is disabled. */
  disabled?: boolean;
}

/** One common entry: laid out like a saved entry, changed on the page only until it is saved. */
const DraftRow: FC<DraftRowProps> = ({ draft, onChange, onRemove, disabled = false }) => {
  const id = draft.id;
  const label = draft.name.trim() || "common entry";
  const showEssential = draft.category !== INCOME;
  return (
    <li className={entryRow()} data-testid={`budget-editor-draft-${id}`}>
      <div className={draftName()}>
        <TextInput
          aria-label={`Name of ${label}`}
          data-testid={`budget-editor-draft-name-${id}`}
          disabled={disabled}
          id={`budget-editor-draft-name-${id}`}
          size="sm"
          value={draft.name}
          onChange={(event) => onChange(id, { name: event.target.value })}
        />
        <StatusBadge size="sm" variant="neutral">
          Common entry
        </StatusBadge>
      </div>
      <div className={rowControls()}>
        <div className={amountField()}>
          <CurrencyInput
            aria-label={`Amount for ${label}`}
            data-testid={`budget-editor-draft-amount-${id}`}
            disabled={disabled}
            id={`budget-editor-draft-amount-${id}`}
            size="sm"
            value={draft.amount}
            onValueChange={(value) => onChange(id, { amount: value })}
          />
        </div>
        <div className={frequencyField()}>
          <Select
            aria-label={`How often for ${label}`}
            data-testid={`budget-editor-draft-frequency-${id}`}
            disabled={disabled}
            id={`budget-editor-draft-frequency-${id}`}
            options={FREQUENCY_OPTIONS}
            size="sm"
            value={draft.frequency}
            onChange={(event) =>
              onChange(id, { frequency: event.target.value as BudgetEntry["frequency"] })
            }
          />
        </div>
        <div className={essentialField()}>
          {showEssential ? (
            <Switch
              aria-label={`Essential: ${label}`}
              checked={draft.isEssential}
              data-testid={`budget-editor-draft-essential-${id}`}
              disabled={disabled}
              id={`budget-editor-draft-essential-${id}`}
              label="Essential"
              onChange={(event) => onChange(id, { isEssential: event.target.checked })}
            />
          ) : null}
        </div>
      </div>
      <Button
        aria-label={`Remove ${label}`}
        className={removeCell()}
        data-testid={`budget-editor-draft-remove-${id}`}
        disabled={disabled}
        id={`budget-editor-draft-remove-${id}`}
        size="sm"
        title={`Remove ${label}`}
        variant="ghost"
        onClick={() => onRemove(id)}
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
  onAdd: (name: string, amount: number, frequency: BudgetEntry["frequency"]) => Promise<boolean>;
}

/**
 * The add row that closes each section: a quiet "Add to …" button that opens a name, amount and
 * frequency row in place, so the editor does not show an empty form under every section.
 */
const AddEntryRow: FC<AddEntryRowProps> = ({ category, slug, label, onAdd }) => {
  const [open, setOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  // Set when the row closes from an Add or a Cancel, so focus goes back to the opener (UX A3).
  const returnFocus = useRef(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [frequency, setFrequency] = useState<BudgetEntry["frequency"]>("monthly");
  const [adding, setAdding] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    const added = await onAdd(trimmed, amount ?? 0, frequency);
    setAdding(false);
    // Keep what was typed when the save failed, so it can be tried again.
    if (added) close();
  };

  const close = () => {
    returnFocus.current = true;
    setName("");
    setAmount(null);
    setFrequency("monthly");
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
      <div className={frequencyField()}>
        <Select
          aria-label={`How often for new entry in ${label}`}
          data-testid={`budget-editor-new-frequency-${slug}`}
          id={`budget-editor-new-frequency-${slug}`}
          options={FREQUENCY_OPTIONS}
          size="sm"
          value={frequency}
          onChange={(event) => setFrequency(event.target.value as BudgetEntry["frequency"])}
        />
      </div>
      <div className={addActions()}>
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
      </div>
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
  drafts = [],
  onDraftChange,
  onDraftRemove,
  onSaveDrafts,
  onRemoveDrafts,
  onFinishEditing,
}) => {
  const toastApi = useOptionalToast();
  const [savingDrafts, setSavingDrafts] = useState(false);
  const savingRef = useRef(false);
  const note = draftNote();
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

  // Leaving edit mode clears the last save message, so it never sits beside a scenario.
  useEffect(() => {
    return () => {
      if (lastToast.current) toastApi?.dismiss(lastToast.current);
    };
  }, [toastApi]);
  const [toRemove, setToRemove] = useState<BudgetEntry | null>(null);
  const [removing, setRemoving] = useState(false);
  // Where focus goes once a deleted row has gone (UX A3): the next row's name, else the heading.
  const pendingFocus = useRef<string | null>(null);
  const editor = budgetEditor();
  const section = editorSection();

  // The read view's order: money in first, then spending ranked by amount, empty categories at the
  // foot. Taken once on opening, so a section never jumps while its amount is being typed; a
  // category added while editing joins the foot.
  const [rankedOrder] = useState(() => rankCategories(categories, entries).map((r) => r.category));
  const sectionOrder = Array.from(
    new Set([INCOME, ...rankedOrder.filter((c) => categories.includes(c)), ...categories]),
  );

  const entriesFor = (category: string) =>
    category === INCOME
      ? entries.filter(isIncomeEntry)
      : entries.filter((e) => e.category === category && !isIncomeEntry(e));

  const draftsFor = (category: string) => drafts.filter((d) => d.category === category);

  const saveDrafts = async () => {
    // The ref, not the state this render captured, stops a double click saving twice.
    if (!onSaveDrafts || savingRef.current) return;
    savingRef.current = true;
    setSavingDrafts(true);
    try {
      // The page moves focus: to this heading, or to its empty-state button if the budget is empty.
      await onSaveDrafts();
    } catch {
      // The page shows what went wrong; the rows not yet saved stay for another try.
    } finally {
      savingRef.current = false;
      setSavingDrafts(false);
    }
  };

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

  const add =
    (category: string) =>
    async (name: string, amount: number, frequency: BudgetEntry["frequency"] = "monthly") => {
      const isIncome = category === INCOME;
      try {
        await onAdd({
          category,
          name,
          amount,
          frequency,
          isIncome,
          isPrimaryIncome: false,
          // Spending is essential by default except everyday expenses and savings.
          isEssential: isIncome ? true : category !== "expenses" && category !== "savings",
          notes: null,
          isDefault: false,
        });
        // The new row on the page is the confirmation, so no message.
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
      className={editor.root}
      id="budget-editor"
      padding="none"
    >
      <div className={editor.header}>
        <h2 className={editor.title} id="budget-editor-heading" tabIndex={-1}>
          Edit your budget
        </h2>
        <p className={editor.hint}>Changes save as you go.</p>
      </div>

      {drafts.length > 0 ? (
        // biome-ignore lint/a11y/useSemanticElements: a fieldset is for form controls with a legend; this labels a note and its two buttons.
        <div
          aria-label="Common entries not saved yet"
          className={note.root}
          data-testid="budget-editor-draft-note"
          role="group"
        >
          <p className={note.text}>
            These common entries are not saved yet. Fill in the amounts that apply to you, then
            save. Entries left blank stay here until you remove them or leave the page.
          </p>
          <div className={note.actions}>
            <Button
              data-testid="budget-editor-save-drafts"
              disabled={!drafts.some(isDraftReady)}
              id="budget-editor-save-drafts"
              pending={savingDrafts}
              size="sm"
              onClick={saveDrafts}
            >
              Save entries
            </Button>
            <Button
              data-testid="budget-editor-remove-drafts"
              disabled={savingDrafts}
              id="budget-editor-remove-drafts"
              size="sm"
              variant="ghost"
              onClick={onRemoveDrafts}
            >
              Remove common entries
            </Button>
          </div>
        </div>
      ) : null}

      <div className={editor.sections}>
        {sectionOrder.map((category) => {
          const label = sectionLabel(category);
          const rows = entriesFor(category);
          const sectionDrafts = draftsFor(category);
          const slug = categorySlug(category);
          const headingId = `budget-editor-section-${slug}`;
          // Income entries in a custom category show under Money in but still belong to it.
          const isEmpty =
            !entries.some((e) => e.category === category) && sectionDrafts.length === 0;
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
              {rows.length > 0 || sectionDrafts.length > 0 ? (
                <ul className={section.list}>
                  {rows.map((entry) => (
                    <EntryRow entry={entry} key={entry.id} onRemove={setToRemove} onSave={save} />
                  ))}
                  {sectionDrafts.map((draft) => (
                    <DraftRow
                      disabled={savingDrafts}
                      draft={draft}
                      key={draft.id}
                      onChange={(id, update) => onDraftChange?.(id, update)}
                      onRemove={(id) => {
                        // Focus goes to the next row's name, else the previous, else the heading.
                        const index = sectionDrafts.findIndex((d) => d.id === id);
                        const next = sectionDrafts[index + 1] ?? sectionDrafts[index - 1];
                        const lastSaved = rows[rows.length - 1];
                        pendingFocus.current = next
                          ? `budget-editor-draft-name-${next.id}`
                          : lastSaved
                            ? `budget-editor-name-${lastSaved.id}`
                            : headingId;
                        onDraftRemove?.(id);
                      }}
                    />
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

      {onAddCategory || onFinishEditing ? (
        <div className={editor.foot}>
          {onAddCategory ? (
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
          ) : null}
          {onFinishEditing ? (
            <Button
              data-testid="budget-editor-finish-editing-btn"
              id="budget-editor-finish-editing-btn"
              onClick={onFinishEditing}
            >
              Finished editing
            </Button>
          ) : null}
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
