import {
  Card,
  ChartFigure,
  CollapsibleDrawer,
  capSeriesWithOther,
  chartColor,
  Icon,
  Money,
  Num,
  seriesColor,
} from "@repo/ui";
import { ChevronRight } from "lucide-react";
import { type FC, useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { usePrefersReducedMotion } from "~/hooks/usePrefersReducedMotion";
import { categoryIcon } from "../../categoryIcons";
import {
  breakdownGrid,
  cardBody,
  cardSubtitle,
  cardTitle,
  categoryAmount,
  categoryCount,
  categoryIconTile,
  categoryIdentity,
  categoryList,
  categoryName,
  categoryRow,
  dataTable,
  donutCentre,
  donutCentreLabel,
  donutFrame,
  emptyNote,
  legend,
  legendRow,
  legendShare,
  perMonth,
} from "./ExpenseBreakdown.styles";

export interface ExpenseCategoryTotal {
  cat: string;
  label: string;
  /** Monthly total. */
  total: number;
  count: number;
}

export interface ExpenseBreakdownProps {
  categories: ExpenseCategoryTotal[];
  totalExpenses: number;
  onNavigateToCategory: (category: string) => void;
}

/** K-08: at most six slices, the remainder grouped as "Other". */
export const MAX_DONUT_SLICES = 6;
const VISIBLE_CATEGORY_ROWS = 8;

const share = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

const Swatch: FC<{ fill: string }> = ({ fill }) => (
  <svg aria-hidden="true" focusable="false" height="10" viewBox="0 0 10 10" width="10">
    <circle cx="5" cy="5" fill={fill} r="5" />
  </svg>
);

export const ExpenseBreakdown: FC<ExpenseBreakdownProps> = ({
  categories,
  totalExpenses,
  onNavigateToCategory,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const reducedMotion = usePrefersReducedMotion();

  const sorted = useMemo(() => [...categories].sort((a, b) => b.total - a.total), [categories]);

  const slices = useMemo(() => {
    const positive = sorted
      .filter((c) => c.total > 0)
      .map((c) => ({ label: c.label, value: c.total }));
    const wasCapped = positive.length > MAX_DONUT_SLICES;
    const capped = capSeriesWithOther(positive, MAX_DONUT_SLICES);
    return capped.map((slice, index) => ({
      ...slice,
      fill: wasCapped && index === capped.length - 1 ? chartColor("baseline") : seriesColor(index),
    }));
  }, [sorted]);

  const summary = `Monthly expenses total ${formatCurrency(totalExpenses)}. ${slices
    .map((s) => `${s.label} ${formatCurrency(s.value)} (${share(s.value, totalExpenses)}%)`)
    .join(", ")}.`;

  const visible = sorted.slice(0, VISIBLE_CATEGORY_ROWS);
  const rest = sorted.slice(VISIBLE_CATEGORY_ROWS);

  const renderRow = (ct: ExpenseCategoryTotal) => (
    <button
      key={ct.cat}
      className={categoryRow()}
      type="button"
      onClick={() => onNavigateToCategory(ct.cat)}
    >
      <span className={categoryIdentity()}>
        <span className={categoryIconTile()}>
          <Icon icon={categoryIcon(ct.cat)} size="sm" />
        </span>
        <span>
          <p className={categoryName()}>{ct.label}</p>
          <p className={categoryCount()}>
            {ct.count} {ct.count === 1 ? "item" : "items"}
          </p>
        </span>
      </span>
      <span className={categoryAmount()}>
        <Money size="sm" value={ct.total} />
        <span className={perMonth()}>a month</span>
        <Icon icon={ChevronRight} size="sm" />
      </span>
    </button>
  );

  return (
    <div className={breakdownGrid()}>
      <Card padding="lg">
        <div className={cardBody()}>
          <div>
            <h2 className={cardTitle()}>Where it goes</h2>
            <p className={cardSubtitle()}>Monthly spending by category</p>
          </div>
          {slices.length > 0 ? (
            <>
              <ChartFigure
                dataTable={
                  <table className={dataTable()}>
                    <caption>Monthly expenses by category</caption>
                    <thead>
                      <tr>
                        <th scope="col">Category</th>
                        <th scope="col">Per month</th>
                        <th scope="col">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slices.map((s) => (
                        <tr key={s.label}>
                          <th scope="row">{s.label}</th>
                          <td>{formatCurrency(s.value)}</td>
                          <td>{share(s.value, totalExpenses)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                }
                hideTitle
                summary={summary}
                title="Expense breakdown by category"
              >
                <div className={donutFrame()}>
                  <ResponsiveContainer height="100%" width="100%">
                    <PieChart>
                      <Pie
                        cx="50%"
                        cy="50%"
                        data={slices}
                        dataKey="value"
                        innerRadius="62%"
                        isAnimationActive={!reducedMotion}
                        nameKey="label"
                        outerRadius="90%"
                        paddingAngle={2}
                        stroke="none"
                      >
                        {slices.map((s) => (
                          <Cell key={s.label} fill={s.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className={donutCentre()}>
                    <span className={donutCentreLabel()}>Expenses</span>
                    <Money size="lg" value={totalExpenses} />
                  </div>
                </div>
              </ChartFigure>
              <ul className={legend()}>
                {slices.map((s) => (
                  <li key={s.label} className={legendRow()}>
                    <Swatch fill={s.fill} />
                    <span>{s.label}</span>
                    <Money size="sm" value={s.value} />
                    <span className={legendShare()}>
                      <Num
                        fractionDigits={0}
                        kind="percent"
                        size="sm"
                        tone="muted"
                        value={share(s.value, totalExpenses)}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className={emptyNote()}>No spending added yet.</p>
          )}
        </div>
      </Card>

      <Card padding="lg">
        <div className={cardBody()}>
          <div>
            <h2 className={cardTitle()}>Your categories</h2>
            <p className={cardSubtitle()}>Largest first. Open one to see its entries.</p>
          </div>
          <div className={categoryList()}>{visible.map(renderRow)}</div>
          {rest.length > 0 && (
            <CollapsibleDrawer
              closedLabel="Show all"
              openLabel="Show fewer"
              title={`${rest.length} more ${rest.length === 1 ? "category" : "categories"}`}
            >
              <div className={categoryList()}>{rest.map(renderRow)}</div>
            </CollapsibleDrawer>
          )}
        </div>
      </Card>
    </div>
  );
};
