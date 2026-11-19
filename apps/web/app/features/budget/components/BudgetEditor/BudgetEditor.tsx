import {
  BUDGET_ACCOUNT_LINK_CATEGORY,
  type BudgetAccountLinkOffer,
  type BudgetLinkOffer,
  defaultIsEssential,
  isBudgetAccountLink,
} from "@flump/finance-engine";
import {
  Button,
  Card,
  ConfirmDialog,
  CurrencyInput,
  Icon,
  Money,
  Select,
  Switch,
  TextInput,
  useOptionalToast,
} from "@repo/ui";
import { Plus, Trash2 } from "lucide-react";
import { type FC, type FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { HousingTenure } from "~/features/housing/components/HousingDetails";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { type BudgetEntry, getCategoryLabel } from "~/types/budget";
import { INCOME_CATEGORY as INCOME, isIncomeEntry } from "../../income";
import {
  isNotSetEntry,
  type LinkableAccount,
  linkedAccountFor,
  notSetActionFor,
} from "../../linkedEntries";
import { rankCategories } from "../BudgetCategoryList";
import { EntryOwnershipField } from "../EntryOwnershipField";
import {
  addActions,
  addRow,
  amountField,
  budgetEditor,
  editorSection,
  entryRow,
  essentialField,
  figure,
  frequencyField,
  linkedAmount,
  linkedName,
  ownershipCell,
  removeCell,
  rowControls,
  sourceLine,
  sourceLink,
} from "./BudgetEditor.styles";

export type NewBudgetEntry = Omit<BudgetEntry, "id" | "userId" | "createdAt" | "updatedAt">;

export interface BudgetEditorProps {
  /** Every saved entry. Income entries (category "income" or `isIncome`) show under "Money in". */
  entries: BudgetEntry[];
  /** The page's categories in order; "income" is shown first as "Money in" whatever its place. */
  categories: string[];
  /**
   * Saves a new entry. Rejects on failure (the page shows the error). `replacesLinkedLine` marks a
   * figure typed over a linked line: it stands in for that line, so the page must not also keep
   * the line.
   */
  onAdd: (entry: NewBudgetEntry, options?: { replacesLinkedLine?: boolean }) => Promise<void>;
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
   * Rows the engine adds from saved details (owner items 7 and 33b): take-home pay from the
   * profile's salary, the rent or mortgage payment from the housing details. Shown in their
   * sections with where the figure comes from; never stored as budget rows.
   */
  linkedEntries?: BudgetEntry[];
  /** Saved rows a linked row stands in for. Not counted anywhere, so not listed. */
  shadowedIds?: string[];
  /**
   * Saved figures not in the budget yet (an income or housing row of the person's own is already
   * there): each listed row gets a button that replaces it with the saved figure. The page's
   * notice offers to add the figure as its own entry instead.
   */
  linkOffers?: BudgetLinkOffer[];
  /**
   * The person's accounts, to name the account a savings or debt line reads and say when it is
   * gone (audit slice 5).
   */
  linkableAccounts?: LinkableAccount[];
  /**
   * Entries that match an account's monthly saving or payment: each gets a "Link to …" button that
   * links it, moving it to Savings or Debt. Nothing is linked unless the person taps.
   */
  accountLinkOffers?: BudgetAccountLinkOffer[];
  /** How the person pays for housing, for the linked housing row. */
  housingStatus?: HousingTenure;
  /** Saves the rent (or household contribution) to the housing details, the one stored value. */
  onSaveHousing?: (monthly: number) => Promise<void>;
  /** Leaves edit mode. Shown as "Finish editing" at the foot (owner item 29). */
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

/** Savings rows offer Essential too, off by default (owner item 28); only money in has none. */
const hasEssentialSwitch = (entry: Pick<BudgetEntry, "isIncome" | "category">) =>
  !isIncomeEntry(entry);

/**
 * The add row's Essential default: spending is essential except everyday expenses, and savings
 * start off (owner item 28). Income is always counted, so it has no switch.
 */
export const defaultEssential = (category: string): boolean =>
  category === INCOME ? true : category !== "expenses" && defaultIsEssential(category);

/** What the saved housing figure is called in a button, by how the person pays for housing. */
const HOUSING_KIND_LABEL: Record<NonNullable<BudgetLinkOffer["kind"]>, string> = {
  rent: "saved rent",
  mortgage: "saved mortgage payment",
  household: "saved household contribution",
};

/** A row's offer: its button text, an accessible name when the text is not enough, its action. */
interface RowLinkOffer {
  label: string;
  ariaLabel?: string;
  onUse: () => void;
}

interface EntryRowProps {
  entry: BudgetEntry;
  onSave: (id: string, update: Partial<BudgetEntry>) => Promise<boolean>;
  onRemove: (entry: BudgetEntry) => void;
  /** Set on a row the saved take-home or housing figure can replace (the person chooses). */
  linkOffer?: RowLinkOffer | null;
}

/** One saved entry, editable where it sits. Text fields save on blur, choices save on change. */
const EntryRow: FC<EntryRowProps> = ({ entry, onSave, onRemove, linkOffer = null }) => {
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
        {/* Spending and savings rows offer it; an essential saving counts in Breathing room. */}
        <div className={essentialField()}>
          {!hasEssentialSwitch(entry) ? null : (
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
        variant="dangerSubtle"
        onClick={() => onRemove(entry)}
      >
        <Icon icon={Trash2} size="sm" />
      </Button>
      {linkOffer ? (
        <p className={sourceLine()}>
          <Button
            aria-label={linkOffer.ariaLabel ?? `${linkOffer.label} in place of ${entry.name}`}
            data-testid={`budget-editor-use-link-${entry.id}`}
            id={`budget-editor-use-link-${entry.id}`}
            size="sm"
            variant="outline"
            onClick={linkOffer.onUse}
          >
            {linkOffer.label}
          </Button>
        </p>
      ) : null}
      {/* E34 C1: sole or joint, and the share a joint entry counts at in the figures. */}
      <div className={ownershipCell()}>
        <EntryOwnershipField
          entryName={entry.name}
          idPrefix={`budget-editor-${entry.id}`}
          ownership={entry.ownership === "joint" ? "joint" : "sole"}
          sharePercent={entry.sharePercent ?? null}
          onChange={(ownership, sharePercent) => void onSave(entry.id, { ownership, sharePercent })}
        />
      </div>
    </li>
  );
};

interface LinkedEntryRowProps {
  entry: BudgetEntry;
  housingStatus: HousingTenure;
  /** The person's accounts, for a savings or debt line. */
  accounts: readonly LinkableAccount[];
  /** Deletes a savings or debt line the person linked (its stored row). */
  onRemove?: (entry: BudgetEntry) => void;
  /** Saves the person's own pay entry in place of the take-home from the profile. */
  onOverrideTakeHome: (amount: number) => Promise<boolean>;
  onSaveHousing?: (monthly: number) => Promise<void>;
  /**
   * Unlinks the row the person linked (`entry.linkedRowId`): its figure becomes their own, typed
   * on the row from now on. Shown only on a line that stands in for such a row.
   */
  onUnlink?: (entry: BudgetEntry) => Promise<boolean>;
}

/**
 * A row read from a saved fact (owner items 7 and 33b, decision 1). It is laid out like a saved
 * entry and says where its figure comes from, with a link there. One stored value: typing a
 * take-home figure saves the person's own pay entry, which then wins; typing a rent saves it to the
 * housing details. A mortgage payment comes from the mortgage details, so it is changed there.
 * When the saved fact is not set the row shows "Not set" with where to add it, never £0, and a
 * row the person linked can be unlinked to type their own figure.
 *
 * A savings or debt line (audit slice 5) reads one account's monthly saving or payment at the
 * person's share. Its figure is changed on the account, so it shows no amount field; it says
 * which account it reads, or that the account was removed or changed, and can be unlinked or
 * deleted like an entry.
 */
const LinkedEntryRow: FC<LinkedEntryRowProps> = ({
  entry,
  housingStatus,
  accounts,
  onRemove,
  onOverrideTakeHome,
  onSaveHousing,
  onUnlink,
}) => {
  const notSet = isNotSetEntry(entry);
  const saved: number | null = notSet ? null : toAmount(entry.amount);
  const [amount, setAmount] = useState<number | null>(saved);
  const amountRef = useRef<number | null>(saved);
  const [unlinking, setUnlinking] = useState(false);
  useEffect(() => {
    amountRef.current = saved;
    setAmount(saved);
  }, [saved]);

  const isTakeHome = entry.linked === "take_home";
  const isAccountLine = isBudgetAccountLink(entry.linked);
  const isMortgage = !isTakeHome && !isAccountLine && housingStatus === "mortgage";
  const idPart = entry.id.replace(/[^a-z0-9-]/gi, "-");
  const sourceId = `budget-editor-source-${idPart}`;
  const action = notSet ? notSetActionFor(entry, housingStatus, accounts) : null;
  const account = isAccountLine ? linkedAccountFor(entry, accounts) : null;
  const accountPage =
    entry.linked === "savings"
      ? { to: "/app/savings", label: "Savings" }
      : { to: "/app/debt", label: "Debt" };
  const accountAmount = entry.linked === "savings" ? "monthly saving" : "monthly payment";
  // Take-home, a mortgage payment and an account's amount are changed on their own pages; a rent
  // can be typed here.
  const showsInput = !isMortgage && !isAccountLine && !(isTakeHome && notSet);

  const saveAmount = async () => {
    const next = amountRef.current;
    if (next === null || (saved !== null && Math.round(next * 100) === Math.round(saved * 100))) {
      amountRef.current = saved;
      setAmount(saved);
      return;
    }
    if (isTakeHome) {
      await onOverrideTakeHome(next);
      return;
    }
    try {
      await onSaveHousing?.(next);
    } catch {
      // The page shows what went wrong; the field keeps what was typed.
    }
  };

  const unlink = async () => {
    if (!onUnlink || unlinking) return;
    setUnlinking(true);
    try {
      await onUnlink(entry);
    } finally {
      setUnlinking(false);
    }
  };

  const source = isAccountLine ? (
    !account ? (
      <>The account this line used was removed or changed. Type your own figure or delete it.</>
    ) : notSet ? (
      <>
        Linked to {account.name}, which has no {accountAmount} saved.
      </>
    ) : (
      <>
        Your share of the {accountAmount} on {account.name}, from the{" "}
        <Link className={sourceLink()} to={accountPage.to}>
          {accountPage.label}
        </Link>{" "}
        page. Change it there.
      </>
    )
  ) : notSet ? (
    isTakeHome ? (
      <>Linked to your take-home pay, which needs your salary in Profile.</>
    ) : isMortgage ? (
      <>Linked to your mortgage payment, which is not saved yet.</>
    ) : (
      <>
        Linked to your housing details, which have no payment saved. A figure you type here saves
        there.
      </>
    )
  ) : isTakeHome ? (
    <>
      From your salary in{" "}
      <Link className={sourceLink()} to="/app/profile">
        Profile
      </Link>
      . A figure you type here is used instead.
    </>
  ) : isMortgage ? (
    <>
      Your own cost, from your{" "}
      <Link className={sourceLink()} to="/app/mortgage">
        mortgage details
      </Link>
      .
    </>
  ) : (
    <>Your own cost, from your housing details. A change here updates them across Flump.</>
  );

  return (
    <li className={entryRow()} data-testid={`budget-editor-row-${idPart}`}>
      <span className={linkedName()} id={`budget-editor-name-${idPart}`}>
        {entry.name}
      </span>
      <div className={rowControls()}>
        <div className={amountField()}>
          {showsInput ? (
            <CurrencyInput
              aria-describedby={sourceId}
              aria-label={`Amount for ${entry.name}`}
              data-testid={`budget-editor-amount-${idPart}`}
              id={`budget-editor-amount-${idPart}`}
              size="sm"
              value={amount}
              onBlur={() => void saveAmount()}
              onValueChange={(value) => {
                amountRef.current = value;
                setAmount(value);
              }}
            />
          ) : (
            <span
              className={linkedAmount()}
              data-testid={`budget-editor-figure-${idPart}`}
              id={`budget-editor-figure-${idPart}`}
            >
              <Money
                notSetAction={
                  action ? (
                    <Link className={sourceLink()} to={action.to}>
                      {action.label}
                    </Link>
                  ) : undefined
                }
                size="sm"
                value={saved}
              />
            </span>
          )}
        </div>
        <div className={frequencyField()}>
          <span className={linkedAmount()}>a month</span>
        </div>
        <div className={essentialField()} />
      </div>
      {isAccountLine && entry.linkedRowId && onRemove ? (
        <Button
          aria-label={`Delete ${entry.name}`}
          className={removeCell()}
          data-testid={`budget-editor-remove-${idPart}`}
          id={`budget-editor-remove-${idPart}`}
          size="sm"
          title={`Delete ${entry.name}`}
          variant="dangerSubtle"
          onClick={() => onRemove(entry)}
        >
          <Icon icon={Trash2} size="sm" />
        </Button>
      ) : (
        <span className={removeCell()} />
      )}
      <p className={sourceLine()} data-testid={sourceId} id={sourceId}>
        {source}
      </p>
      {entry.linkedRowId && onUnlink ? (
        <div className={sourceLine()}>
          <Button
            data-testid={`budget-editor-unlink-${idPart}`}
            id={`budget-editor-unlink-${idPart}`}
            disabled={unlinking}
            size="sm"
            variant="outline"
            onClick={() => void unlink()}
          >
            Type my own figure
          </Button>
        </div>
      ) : null}
    </li>
  );
};

interface AddEntryRowProps {
  category: string;
  /** The id fragment for this section's controls. */
  slug: string;
  label: string;
  onAdd: (entry: NewEntryFields) => Promise<boolean>;
}

/** What the add row collects: the same fields a saved row shows (owner item 26). */
export interface NewEntryFields {
  name: string;
  amount: number;
  frequency: BudgetEntry["frequency"];
  isEssential: boolean;
  ownership: "sole" | "joint";
  sharePercent: number | null;
}

/**
 * The add row that closes each section: a quiet "Add to …" button that opens a row in place, so
 * the editor does not show an empty form under every section. It holds the same fields, in the
 * same sizes and columns, as a saved row: name, amount, how often, Essential and sole or joint.
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
  const [isEssential, setIsEssential] = useState(() => defaultEssential(category));
  const [ownership, setOwnership] = useState<"sole" | "joint">("sole");
  const [sharePercent, setSharePercent] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const showEssential = category !== INCOME;
  const newLabel = name.trim() || `new entry in ${label}`;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    const added = await onAdd({
      name: trimmed,
      amount: amount ?? 0,
      frequency,
      isEssential: showEssential ? isEssential : true,
      ownership,
      sharePercent: ownership === "joint" ? sharePercent : null,
    });
    setAdding(false);
    // Keep what was typed when the save failed, so it can be tried again.
    if (added) close();
  };

  const close = () => {
    returnFocus.current = true;
    setName("");
    setAmount(null);
    setFrequency("monthly");
    setIsEssential(defaultEssential(category));
    setOwnership("sole");
    setSharePercent(null);
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
      <div className={rowControls()}>
        <div className={amountField()}>
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
        <div className={essentialField()}>
          {showEssential ? (
            <Switch
              aria-label={`Essential: ${newLabel}`}
              checked={isEssential}
              data-testid={`budget-editor-new-essential-${slug}`}
              id={`budget-editor-new-essential-${slug}`}
              label="Essential"
              onChange={(event) => setIsEssential(event.target.checked)}
            />
          ) : null}
        </div>
      </div>
      <span className={removeCell()} />
      <div className={ownershipCell()}>
        <EntryOwnershipField
          entryName={newLabel}
          idPrefix={`budget-editor-new-${slug}`}
          ownership={ownership}
          sharePercent={sharePercent}
          onChange={(nextOwnership, nextShare) => {
            setOwnership(nextOwnership);
            setSharePercent(nextShare);
          }}
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
  linkedEntries = [],
  shadowedIds = [],
  linkOffers = [],
  linkableAccounts = [],
  accountLinkOffers = [],
  housingStatus = null,
  onSaveHousing,
  onFinishEditing,
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
  // category added while editing joins the foot. Empty categories stay here so they can be filled.
  const [rankedOrder] = useState(() =>
    rankCategories(categories, [...entries, ...linkedEntries], { keepEmpty: true }).map(
      (r) => r.category,
    ),
  );
  const sectionOrder = Array.from(
    new Set([INCOME, ...rankedOrder.filter((c) => categories.includes(c)), ...categories]),
  );

  // Saved rows a linked row stands in for count nowhere, so they are not listed.
  const listed = entries.filter((e) => !shadowedIds.includes(e.id));
  const entriesFor = (category: string) =>
    category === INCOME
      ? listed.filter(isIncomeEntry)
      : listed.filter((e) => e.category === category && !isIncomeEntry(e));
  const linkedFor = (category: string) =>
    linkedEntries.filter((e) =>
      category === INCOME ? isIncomeEntry(e) : e.category === category && !isIncomeEntry(e),
    );
  // A row the saved take-home or housing figure can replace, by the person's choice: the button
  // stores the link on the row and sets its amount to £0, so the saved figure is the one value.
  const linkOfferFor = (entry: BudgetEntry): RowLinkOffer | null => {
    // An entry that matches an account's monthly amount (audit slice 5): linking moves it to
    // Savings or Debt and stores no amount, so the account's figure counts once.
    const accountOffer = accountLinkOffers.find((o) => o.rowId === entry.id);
    if (accountOffer) {
      return {
        label: `Link to ${accountOffer.accountName}`,
        ariaLabel: `Link ${entry.name} to ${accountOffer.accountName}`,
        onUse: () =>
          void save(entry.id, {
            amount: 0,
            category: BUDGET_ACCOUNT_LINK_CATEGORY[accountOffer.link],
            linkKind: accountOffer.link,
            linkAccountId: accountOffer.accountId,
          }),
      };
    }
    const offer = linkOffers.find((o) => o.rowIds.includes(entry.id));
    if (!offer) return null;
    const figureText = formatCurrency(offer.monthly, { maximumFractionDigits: 0 });
    // The mortgage accounts' estimate is not a saved figure: it reads "about".
    const what =
      offer.link === "take_home"
        ? "take-home pay"
        : offer.paymentEstimated
          ? "mortgage payment"
          : HOUSING_KIND_LABEL[offer.kind ?? "rent"];
    return {
      label: `Use your ${what} of ${offer.paymentEstimated ? "about " : ""}${figureText}`,
      onUse: () => void save(entry.id, { amount: 0, linkKind: offer.link }),
    };
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
    (category: string, options?: { replacesLinkedLine?: boolean }) =>
    async (fields: NewEntryFields) => {
      const isIncome = category === INCOME;
      try {
        const entry: NewBudgetEntry = {
          category,
          name: fields.name,
          amount: fields.amount,
          frequency: fields.frequency,
          isIncome,
          isPrimaryIncome: false,
          isEssential: isIncome ? true : fields.isEssential,
          ownership: fields.ownership,
          sharePercent: fields.sharePercent,
          notes: null,
          isDefault: false,
        };
        await (options ? onAdd(entry, options) : onAdd(entry));
        // The new row on the page is the confirmation, so no message.
        return true;
      } catch {
        return false;
      }
    };

  // Typing over the linked take-home saves the person's own pay (owner item 7): back on the row it
  // replaced, unlinked, when there is one, else as a new entry. Either way it is then their figure.
  const overrideTakeHome = (amount: number) => {
    const replaced = entries.find((e) => shadowedIds.includes(e.id) && e.linkKind === "take_home");
    if (replaced) return save(replaced.id, { amount, linkKind: null });
    return add(INCOME, { replacesLinkedLine: true })({
      name: "Take-home pay",
      amount,
      frequency: "monthly",
      isEssential: true,
      ownership: "sole",
      sharePercent: null,
    });
  };

  // "Type my own figure" (decision 1): the linked row keeps the figure it showed as the person's
  // own, monthly and at the same share, and stops reading the saved fact. A line that was not set
  // keeps no figure, and its amount field takes focus so the person can type one.
  const unlink = async (entry: BudgetEntry) => {
    const rowId = entry.linkedRowId;
    if (!rowId) return false;
    const done = await save(rowId, {
      linkKind: null,
      linkAccountId: null,
      amount: entry.notSet ? 0 : toAmount(entry.amount),
      frequency: "monthly",
      ownership: entry.ownership === "joint" ? "joint" : "sole",
      sharePercent: entry.ownership === "joint" ? (entry.sharePercent ?? null) : null,
    });
    if (done) pendingFocus.current = `budget-editor-amount-${rowId}`;
    return done;
  };

  const saveHousing = async (monthly: number) => {
    if (!onSaveHousing) return;
    await onSaveHousing(monthly);
    toast?.toast({ title: "Saved" });
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

      <div className={editor.sections}>
        {sectionOrder.map((category) => {
          const label = sectionLabel(category);
          const rows = entriesFor(category);
          const linkedRows = linkedFor(category);
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
              {rows.length > 0 || linkedRows.length > 0 ? (
                <ul className={section.list}>
                  {linkedRows.map((entry) => (
                    <LinkedEntryRow
                      accounts={linkableAccounts}
                      entry={entry}
                      housingStatus={housingStatus}
                      key={entry.id}
                      onRemove={(line) =>
                        // The stored row is what is deleted; the dialog names the line.
                        line.linkedRowId
                          ? setToRemove({ ...line, id: line.linkedRowId })
                          : undefined
                      }
                      onOverrideTakeHome={overrideTakeHome}
                      onSaveHousing={saveHousing}
                      onUnlink={unlink}
                    />
                  ))}
                  {rows.map((entry) => (
                    <EntryRow
                      entry={entry}
                      key={entry.id}
                      linkOffer={linkOfferFor(entry)}
                      onRemove={setToRemove}
                      onSave={save}
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
          {/* Owner item 29: the way out at the foot too, so a long budget needs no scroll back. */}
          {onFinishEditing ? (
            <Button
              data-testid="budget-editor-finish-editing-btn"
              id="budget-editor-finish-editing-btn"
              onClick={onFinishEditing}
            >
              Finish editing
            </Button>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        scope="single"
        confirmLabel="Delete entry"
        description={
          toRemove?.notSet ? (
            <p>{toRemove.name} will be deleted from your budget. This cannot be undone.</p>
          ) : toRemove ? (
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
