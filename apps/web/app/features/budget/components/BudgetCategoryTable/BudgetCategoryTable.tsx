import {
  Button,
  Card,
  CollapsibleDrawer,
  EmptyState,
  Icon,
  Money,
  StatusBadge,
  Table,
  TBody,
  Td,
  THead,
  Th,
  VisuallyHidden,
} from "@repo/ui";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { type FC, useState } from "react";
import { ConfirmDialog } from "~/features/feedback/components/ConfirmDialog";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { BudgetCategory, BudgetEntry } from "~/types/budget";
import { CATEGORY_LABELS, getDaysUntilContractEnd, toMonthly } from "~/types/budget";
import { roundTo2dp } from "~/utils/roundTo2dp";
import { categoryIcon } from "../../categoryIcons";
import { BudgetEntryDialog, EMPTY_ENTRY_VALUES, type EntryFormValues } from "../BudgetEntryDialog";
import {
  actionsCell,
  badgeRow,
  drawerWrap,
  frequencyText,
  headerActions,
  headerIcon,
  headerIdentity,
  headerMeta,
  headerTitle,
  nameCell,
  nameText,
  noteText,
  tableHeader,
  tableRoot,
} from "./BudgetCategoryTable.styles";

export interface BudgetCategoryTableProps {
  category: BudgetCategory;
  entries: BudgetEntry[];
  onAdd: (entry: Omit<BudgetEntry, "id" | "userId" | "createdAt" | "updatedAt">) => Promise<void>;
  onUpdate: (id: string, update: Partial<BudgetEntry>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDeleteCategory?: (category: string) => void;
  /**
   * Shown under its row in the category list, which already names the category and its total:
   * the heading and total are left out and only the actions and entries show.
   */
  embedded?: boolean;
}

/** Law 3: a table over eight rows keeps the rest behind a drawer. */
const VISIBLE_ROWS = 8;

interface EditingState {
  id: string | null;
  initial: EntryFormValues;
}

const RenewalBadge: FC<{ entry: BudgetEntry }> = ({ entry }) => {
  const days = getDaysUntilContractEnd(entry.contractEndDate);
  if (days === null) return null;
  const unit = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
  // A date, not a verdict: one neutral badge whatever the distance (UX-GUIDELINES T2).
  if (days === 0) return <StatusBadge variant="neutral">Ends today</StatusBadge>;
  if (days < 0) {
    return <StatusBadge variant="neutral">Ended {unit(Math.abs(days))} ago</StatusBadge>;
  }
  return <StatusBadge variant="neutral">Renews in {unit(days)}</StatusBadge>;
};

export const BudgetCategoryTable: FC<BudgetCategoryTableProps> = ({
  category,
  entries,
  onAdd,
  onUpdate,
  onDelete,
  onDeleteCategory,
  embedded = false,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isIncome = category === "income";
  const label = CATEGORY_LABELS[category] || category;
  const total = entries.reduce((sum, e) => sum + toMonthly(e), 0);
  const entryToDelete = entries.find((entry) => entry.id === deleteId);

  const startNew = () => setEditing({ id: null, initial: { ...EMPTY_ENTRY_VALUES } });

  const startEdit = (entry: BudgetEntry) =>
    setEditing({
      id: entry.id,
      initial: {
        name: entry.name,
        amount: Number.isFinite(Number(entry.amount)) ? Number(entry.amount) : null,
        frequency: entry.frequency,
        notes: entry.notes ?? "",
        isEssential: entry.isEssential,
        contractEndDate: entry.contractEndDate ?? "",
      },
    });

  const save = async (values: EntryFormValues) => {
    if (!editing || !values.name.trim() || values.amount === null) return;
    setSaving(true);
    try {
      const amount = roundTo2dp(values.amount);
      const contractEndDate = values.contractEndDate.trim() || null;
      if (editing.id) {
        await onUpdate(editing.id, {
          name: values.name.trim(),
          amount,
          frequency: values.frequency,
          notes: values.notes || null,
          isEssential: values.isEssential,
          contractEndDate,
        });
      } else {
        await onAdd({
          category,
          name: values.name.trim(),
          amount,
          frequency: values.frequency,
          isIncome,
          isPrimaryIncome: false,
          isEssential: values.isEssential,
          notes: values.notes || null,
          isDefault: false,
          contractEndDate,
        });
      }
      setEditing(null);
    } catch {
      // The container shows the error; keep the dialog open so nothing typed is lost.
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await onDelete(deleteId);
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const frequencyDetail = (entry: BudgetEntry) => {
    const raw = formatCurrency(Number(entry.amount) || 0);
    if (entry.frequency === "annual") return `Yearly, ${raw} a year`;
    if (entry.frequency === "weekly") return `Weekly, ${raw} a week`;
    return "Monthly";
  };

  const renderTable = (rows: BudgetEntry[]) => (
    <Table caption={`${label} entries`}>
      <THead>
        <tr>
          <Th>Name</Th>
          <Th>How often</Th>
          <Th numeric>Amount a month</Th>
          <Th>
            <VisuallyHidden>Actions</VisuallyHidden>
          </Th>
        </tr>
      </THead>
      <TBody>
        {rows.map((entry) => (
          <tr key={entry.id}>
            <Td>
              <div className={nameCell()}>
                <p className={nameText()}>{entry.name}</p>
                <div className={badgeRow()}>
                  {!isIncome && (
                    <StatusBadge variant={entry.isEssential ? "info" : "neutral"}>
                      {entry.isEssential ? "Essential" : "Flexible"}
                    </StatusBadge>
                  )}
                  {entry.isPrimaryIncome && <StatusBadge variant="brand">Main income</StatusBadge>}
                  <RenewalBadge entry={entry} />
                </div>
                {entry.notes && <p className={noteText()}>{entry.notes}</p>}
              </div>
            </Td>
            <Td>
              <span className={frequencyText()}>{frequencyDetail(entry)}</span>
            </Td>
            <Td numeric>
              <Money fractionDigits={2} size="sm" value={Math.abs(toMonthly(entry))} />
            </Td>
            <Td>
              <div className={actionsCell()}>
                <Button
                  aria-label={`Edit ${entry.name}`}
                  size="sm"
                  title="Edit"
                  variant="ghost"
                  onClick={() => startEdit(entry)}
                >
                  <Icon icon={Pencil} size="sm" />
                </Button>
                {!entry.isPrimaryIncome && (
                  <Button
                    aria-label={`Delete ${entry.name}`}
                    size="sm"
                    title="Delete"
                    variant="ghost"
                    onClick={() => setDeleteId(entry.id)}
                  >
                    <Icon icon={Trash2} size="sm" />
                  </Button>
                )}
              </div>
            </Td>
          </tr>
        ))}
      </TBody>
    </Table>
  );

  const visible = entries.slice(0, VISIBLE_ROWS);
  const rest = entries.slice(VISIBLE_ROWS);

  return (
    <div className={tableRoot()}>
      <div className={tableHeader()}>
        {embedded ? null : (
          <div className={headerIdentity()}>
            <span className={headerIcon()}>
              <Icon icon={categoryIcon(category)} size="md" />
            </span>
            <div>
              <h2 className={headerTitle()}>{label}</h2>
              <p className={headerMeta()}>
                <span>{entries.length === 1 ? "1 item" : `${entries.length} items`}</span>
                <span aria-hidden="true">·</span>
                <span>Total</span>
                <Money size="sm" value={Number.isFinite(total) ? total : 0} />
                <span>a month</span>
              </p>
            </div>
          </div>
        )}
        <div className={headerActions()}>
          {onDeleteCategory && entries.length === 0 && (
            <Button
              id="delete-category-btn"
              size="sm"
              variant="outline"
              onClick={() => onDeleteCategory(category)}
            >
              <Icon icon={Trash2} size="sm" />
              Delete category
            </Button>
          )}
          <Button id="add-entry-btn" size="sm" variant="outline" onClick={startNew}>
            <Icon icon={Plus} size="sm" />
            Add entry
          </Button>
        </div>
      </div>

      <Card padding="none">
        {entries.length === 0 ? (
          <EmptyState
            action={
              <Button size="sm" variant="outline" onClick={startNew}>
                Add entry
              </Button>
            }
            description={`Add the ${label.toLowerCase()} you pay or receive and it will show in your budget.`}
            headingLevel="h3"
            size="sm"
            title="Nothing here yet"
          />
        ) : (
          <>
            {renderTable(visible)}
            {rest.length > 0 && (
              <div className={drawerWrap()}>
                <CollapsibleDrawer
                  closedLabel="Show all"
                  openLabel="Show fewer"
                  title={`${rest.length} more ${rest.length === 1 ? "entry" : "entries"}`}
                >
                  {renderTable(rest)}
                </CollapsibleDrawer>
              </div>
            )}
          </>
        )}
      </Card>

      {editing && (
        <BudgetEntryDialog
          key={editing.id ?? "new"}
          categoryLabel={label}
          initial={editing.initial}
          isIncome={isIncome}
          mode={editing.id ? "edit" : "add"}
          saving={saving}
          showContractDate={category === "bills"}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}

      <ConfirmDialog
        confirmLabel="Delete entry"
        description="This entry will be deleted from your budget. This cannot be undone."
        open={entryToDelete !== undefined}
        pending={deleting}
        title={`Delete ${entryToDelete?.name ?? "entry"}?`}
        tone="danger"
        onConfirm={confirmDelete}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      />
    </div>
  );
};
