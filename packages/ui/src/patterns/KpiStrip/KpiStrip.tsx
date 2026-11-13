import { type FC, Fragment, type ReactNode } from "react";
import { cx, type RecipeVariantProps } from "../../../styled-system/css";
import { kpiStripGrid } from "./KpiStrip.styles";

export type KpiStripVariants = RecipeVariantProps<typeof kpiStripGrid>;

/** One to four items, enforced by type: a fifth KPI is a compile error. */
export type KpiStripItems =
  | readonly [ReactNode]
  | readonly [ReactNode, ReactNode]
  | readonly [ReactNode, ReactNode, ReactNode]
  | readonly [ReactNode, ReactNode, ReactNode, ReactNode];

interface KpiStripBaseProps extends KpiStripVariants {
  className?: string;
}

/** Pass either `children` (free form) or `items` (a tuple of up to four, so the cap is typed). */
export type KpiStripProps = KpiStripBaseProps &
  ({ children: ReactNode; items?: never } | { items: KpiStripItems; children?: never });

/**
 * Top-level page metrics in one row from `sm` upwards, 2x2 at phone width (I-09). Uses compact
 * density. With `items`, `columns` follows the item count unless given.
 */
export const KpiStrip: FC<KpiStripProps> = ({ children, items, columns, className }) => {
  const resolvedColumns = columns ?? (items ? (items.length as 1 | 2 | 3 | 4) : 4);
  return (
    <div
      className={cx(kpiStripGrid({ columns: resolvedColumns }), className)}
      data-density="compact"
    >
      {items
        ? items.map((item, index) => <Fragment key={`kpi-${index}`}>{item}</Fragment>)
        : children}
    </div>
  );
};

export default KpiStrip;
