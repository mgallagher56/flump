import { Button, Card, Icon, Money, ProgressBar } from "@repo/ui";
import { ChevronDown, Plus } from "lucide-react";
import { type FC, type ReactNode, useMemo } from "react";
import type { BudgetEntry } from "~/types/budget";
import { CATEGORY_LABELS, toMonthly } from "~/types/budget";
import { categoryIcon } from "../../categoryIcons";
import {
  categoryList,
  chevron,
  entriesPanel,
  listFoot,
  rowEnd,
  shareBar,
} from "./BudgetCategoryList.styles";

/** A safe id fragment from a category name (custom names may hold spaces or symbols). */
function categorySlug(category: string): string {
  return (
    category
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "category"
  );
}

export interface BudgetCategoryListProps {
  /** Every category to list, in their natural order (ties keep it). */
  categories: string[];
  entries: BudgetEntry[];
  /** The category whose entries are open, if any. One at a time. */
  openCategory: string | null;
  onToggleCategory: (category: string) => void;
  /** Renders the open category's entries (the entry table) under its row. */
  renderEntries: (category: string) => ReactNode;
  onAddCategory: () => void;
}

export interface CategoryRow {
  category: string;
  label: string;
  total: number;
  count: number;
}

/**
 * Categories ranked by their monthly amount, largest first; empty ones keep their order at the
 * foot. Income is a category like any other, so every entry is one tap away.
 */
export function rankCategories(categories: string[], entries: BudgetEntry[]): CategoryRow[] {
  const all = Array.from(new Set([...categories, ...entries.map((e) => e.category)]));
  return all
    .map((category, index) => {
      const inCategory = entries.filter((e) => e.category === category);
      const total = inCategory.reduce((s, e) => s + Math.abs(toMonthly(e)), 0);
      return {
        index,
        row: {
          category,
          label: CATEGORY_LABELS[category] || category,
          total: Number.isFinite(total) ? total : 0,
          count: inCategory.length,
        },
      };
    })
    .sort((a, b) => b.row.total - a.row.total || a.index - b.index)
    .map(({ row }) => row);
}

const entryCount = (n: number) =>
  n === 0 ? "No entries yet" : `${n} ${n === 1 ? "entry" : "entries"}`;

/**
 * The budget's one category list (E16 PR 5): one figure per row, a thin bar showing each
 * category's share, and the row opens its entries. Replaces the donut, its legend, the fixed and
 * flexible cards and the pill nav. Neutral ink throughout: a share is a fact, not a verdict.
 */
export const BudgetCategoryList: FC<BudgetCategoryListProps> = ({
  categories,
  entries,
  openCategory,
  onToggleCategory,
  renderEntries,
  onAddCategory,
}) => {
  const slots = categoryList();
  const rows = useMemo(() => rankCategories(categories, entries), [categories, entries]);
  // Bars share one scale: the larger of money in and money out, so income reads as a whole.
  const scale = useMemo(() => {
    const incoming = rows
      .filter((r) => entries.some((e) => e.category === r.category && e.isIncome))
      .reduce((s, r) => s + r.total, 0);
    const outgoing = rows.reduce((s, r) => s + r.total, 0) - incoming;
    return Math.max(incoming, outgoing, 0);
  }, [rows, entries]);

  return (
    <Card aria-labelledby="budget-categories-heading" as="section" padding="lg">
      <div className={slots.header}>
        <h2 className={slots.title} id="budget-categories-heading">
          Your categories
        </h2>
      </div>
      <ul className={slots.list}>
        {rows.map((row) => {
          const open = openCategory === row.category;
          const slug = categorySlug(row.category);
          const panelId = `budget-category-${slug}-entries`;
          const share = scale > 0 ? Math.min(100, (row.total / scale) * 100) : 0;
          return (
            <li className={slots.item} data-list-row="" key={row.category}>
              <button
                aria-controls={panelId}
                aria-expanded={open}
                className={slots.row}
                data-testid={`budget-category-${row.category}`}
                id={`budget-category-${slug}`}
                type="button"
                onClick={() => onToggleCategory(row.category)}
              >
                <span className={slots.identity}>
                  <span className={slots.text}>
                    <span className={slots.icon}>
                      <Icon icon={categoryIcon(row.category)} size="sm" />
                    </span>
                    <span className={slots.name}>
                      <span>{row.label}</span>
                      <span className={slots.meta}>{entryCount(row.count)}</span>
                    </span>
                  </span>
                  <span className={rowEnd()}>
                    {row.count > 0 ? <Money size="sm" value={row.total} /> : null}
                    <span className={chevron({ open })}>
                      <Icon icon={ChevronDown} size="sm" />
                    </span>
                  </span>
                </span>
              </button>
              {row.count > 0 ? (
                // Decorative: the row's amount is the figure; the bar only shows its share.
                <div aria-hidden="true" className={shareBar()}>
                  <ProgressBar max={100} size="sm" value={share} variant="primary" />
                </div>
              ) : null}
              <div className={entriesPanel()} hidden={!open} id={panelId}>
                {open ? renderEntries(row.category) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <div className={listFoot()}>
        <Button
          data-testid="add-category-btn"
          id="add-category-btn"
          size="sm"
          variant="outline"
          onClick={onAddCategory}
        >
          <Icon icon={Plus} size="sm" />
          Add category
        </Button>
      </div>
    </Card>
  );
};
