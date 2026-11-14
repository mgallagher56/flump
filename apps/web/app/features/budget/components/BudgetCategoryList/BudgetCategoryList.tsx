import { Button, Card, Icon, Money, ProgressBar } from "@repo/ui";
import { ChevronDown, Plus } from "lucide-react";
import { type FC, type ReactNode, useMemo } from "react";
import type { BudgetEntry } from "~/types/budget";
import { CATEGORY_LABELS, toMonthly } from "~/types/budget";
import { categoryIcon } from "../../categoryIcons";
import { INCOME_CATEGORY, isIncomeEntry } from "../../income";
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
  /** Shows an "Add category" button at the foot. Left out while categories are edited elsewhere. */
  onAddCategory?: () => void;
  /**
   * Replaces a row's "3 entries" line, e.g. the housing row names how you pay for housing. The
   * row's amount is still the one figure (housing cost shows once, here).
   */
  metaFor?: (category: string) => string | undefined;
}

export interface CategoryRow {
  category: string;
  label: string;
  total: number;
  count: number;
}

export { INCOME_CATEGORY };

/** True when a category holds nothing but income, so a stray spending row never hides. */
const isIncomeCategory = (category: string, entries: BudgetEntry[]): boolean => {
  const inCategory = entries.filter((e) => e.category === category);
  if (inCategory.some((e) => !isIncomeEntry(e))) return false;
  return category === INCOME_CATEGORY || inCategory.length > 0;
};

/**
 * Where the money goes: categories ranked by their monthly amount, largest first; empty ones keep
 * their order at the foot. Income categories are left out (E16 R2-6).
 */
export function rankCategories(categories: string[], entries: BudgetEntry[]): CategoryRow[] {
  const all = Array.from(new Set([...categories, ...entries.map((e) => e.category)])).filter(
    (category) => !isIncomeCategory(category, entries),
  );
  return all
    .map((category, index) => {
      const inCategory = entries.filter((e) => e.category === category && !isIncomeEntry(e));
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
 * The budget's one category list (E16 PR 5, R2-6): one figure per row, a thin bar showing each
 * category's share of money in, and the row opens its entries. Neutral ink throughout: a share is
 * a fact, not a verdict.
 */
export const BudgetCategoryList: FC<BudgetCategoryListProps> = ({
  categories,
  entries,
  openCategory,
  onToggleCategory,
  renderEntries,
  onAddCategory,
  metaFor,
}) => {
  const slots = categoryList();
  const rows = useMemo(() => rankCategories(categories, entries), [categories, entries]);
  // Bars show each category's share of money in; without income, of everything going out.
  const scale = useMemo(() => {
    const incoming = entries.filter(isIncomeEntry).reduce((s, e) => s + Math.abs(toMonthly(e)), 0);
    const outgoing = rows.reduce((s, r) => s + r.total, 0);
    return incoming > 0 ? incoming : outgoing;
  }, [rows, entries]);

  return (
    <Card aria-labelledby="budget-categories-heading" as="section" padding="lg">
      <div className={slots.header}>
        <h2 className={slots.title} id="budget-categories-heading">
          Where your money goes
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
                      <span className={slots.meta}>
                        {metaFor?.(row.category) ?? entryCount(row.count)}
                      </span>
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
      {onAddCategory ? (
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
      ) : null}
    </Card>
  );
};
