import type { FC, ReactNode } from "react";
import { cx, type RecipeVariantProps } from "../../../styled-system/css";
import { kpiStripGrid } from "./KpiStrip.styles";

export type KpiStripVariants = RecipeVariantProps<typeof kpiStripGrid>;

export interface KpiStripProps extends KpiStripVariants {
  children: ReactNode;
  className?: string;
}

/** Top-level page metrics in one row (2x2 at phone width). Uses compact density. */
export const KpiStrip: FC<KpiStripProps> = ({ children, columns = 4, className }) => {
  return (
    <div className={cx(kpiStripGrid({ columns }), className)} data-density="compact">
      {children}
    </div>
  );
};

export default KpiStrip;
