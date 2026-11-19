import { Button, Card, Icon, Money, PageSection, VisuallyHidden } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { ArrowRight, ChartPie, ChevronDown, Pencil, Plus } from "lucide-react";
import { type FC, type ReactNode, useMemo } from "react";
import { SampleAwareLink } from "~/components/navigation/SampleAwareLink";
import type { BudgetEntry } from "~/types/budget";
import { CATEGORY_LABELS, toMonthly } from "~/types/budget";
import { categoryIcon } from "../../categoryIcons";
import { INCOME_CATEGORY, isIncomeEntry } from "../../income";
import {
  categoryList,
  chevron,
  entriesPanel,
  listFoot,
  openRow,
  rowEnd,
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
   * A quiet line under a row's name, e.g. the housing row names how you pay for housing. The
   * row's amount is still the one figure (housing cost shows once, here).
   */
  metaFor?: (category: string) => string | undefined;
  /**
   * Makes a row a link to another page in place of opening its entries, e.g. a mortgage
   * holder's housing row opens the mortgage page. `page` names the destination, spoken after the
   * row's amount ("£1,250 a month, open the mortgage page").
   */
  hrefFor?: (category: string) => { to: string; page: string } | undefined;
  /**
   * A quiet note shown under a row, outside its opened entries, so it is seen without opening
   * the category (e.g. an entry that may already be counted with your debts).
   */
  noticeFor?: (category: string) => ReactNode;
  /**
   * Opens the in-place budget editor. Shown as "Edit budget" on this section's heading row, the
   * page's one edit action (owner item 30).
   */
  onEditBudget?: () => void;
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
 * Where the money goes: categories ranked by their monthly amount, largest first. Income
 * categories are left out (E16 R2-6). A category with no amount (no entries, or only £0 ones such
 * as an old "ISA / Investments" suggestion) is left out too, owner item 33a; the editor keeps
 * them (`keepEmpty`), at the foot in their order, so they can be filled in.
 */
export function rankCategories(
  categories: string[],
  entries: BudgetEntry[],
  options: { keepEmpty?: boolean } = {},
): CategoryRow[] {
  const all = Array.from(new Set([...categories, ...entries.map((e) => e.category)])).filter(
    (category) => !isIncomeCategory(category, entries),
  );
  const ranked = all
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
  return options.keepEmpty ? ranked : ranked.filter((row) => Math.round(row.total) > 0);
}

/**
 * The budget's one category list (E16 PR 5, R2-6): one figure per row, and the row opens its
 * entries, or links to the page that holds them. Neutral ink throughout.
 */
export const BudgetCategoryList: FC<BudgetCategoryListProps> = ({
  categories,
  entries,
  openCategory,
  onToggleCategory,
  renderEntries,
  onAddCategory,
  metaFor,
  hrefFor,
  noticeFor,
  onEditBudget,
}) => {
  const slots = categoryList();
  const rows = useMemo(() => rankCategories(categories, entries), [categories, entries]);

  return (
    <PageSection
      action={
        onEditBudget ? (
          <Button
            data-testid="where-money-goes-edit-btn"
            id="where-money-goes-edit-btn"
            size="sm"
            variant="outline"
            onClick={onEditBudget}
          >
            <Icon icon={Pencil} size="sm" />
            Edit budget
          </Button>
        ) : undefined
      }
      description="Your regular monthly spending, by category (not one-off purchases). Open one to see its entries."
      domain="pay"
      icon={ChartPie}
      id="budget-categories"
      title="Where your money goes"
    >
      <Card padding="lg">
        <ul className={slots.list}>
          {rows.map((row) => {
            const open = openCategory === row.category;
            const slug = categorySlug(row.category);
            const panelId = `budget-category-${slug}-entries`;
            const meta = metaFor?.(row.category);
            const link = hrefFor?.(row.category);
            const notice = noticeFor?.(row.category) ?? null;
            const identity = (end: ReactNode, spoken?: string) => (
              <span className={slots.identity}>
                <span className={slots.text}>
                  <span className={slots.icon}>
                    <Icon icon={categoryIcon(row.category)} size="sm" />
                  </span>
                  <span className={slots.name}>
                    <span>{row.label}</span>
                    {meta ? <span className={slots.meta}>{meta}</span> : null}
                  </span>
                </span>
                <span className={rowEnd()}>
                  {row.count > 0 ? <Money size="sm" value={row.total} /> : null}
                  {spoken ? <VisuallyHidden>{spoken}</VisuallyHidden> : null}
                  {end}
                </span>
              </span>
            );
            if (link) {
              // The visible name, tenure and amount, then what the link does, read as one name.
              const spoken = `${row.count > 0 ? " a month" : ""}, open the ${link.page}`;
              return (
                <li className={slots.item} data-list-row="" key={row.category}>
                  <SampleAwareLink
                    className={slots.row}
                    data-testid={`budget-category-${row.category}`}
                    id={`budget-category-${slug}`}
                    sampleAriaLabel={`${row.label}, sign up to open the ${link.page}`}
                    sampleLabel={identity(null)}
                    to={link.to}
                  >
                    {identity(
                      <span className={chevron({ open: false })}>
                        <Icon icon={ArrowRight} size="sm" />
                      </span>,
                      spoken,
                    )}
                  </SampleAwareLink>
                  {notice}
                </li>
              );
            }
            return (
              <li className={slots.item} data-list-row="" key={row.category}>
                <button
                  aria-controls={panelId}
                  aria-expanded={open}
                  className={cx(slots.row, open ? openRow() : undefined)}
                  data-testid={`budget-category-${row.category}`}
                  id={`budget-category-${slug}`}
                  type="button"
                  onClick={() => onToggleCategory(row.category)}
                >
                  {identity(
                    <span className={chevron({ open })}>
                      <Icon icon={ChevronDown} size="sm" />
                    </span>,
                  )}
                </button>
                {notice}
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
    </PageSection>
  );
};
