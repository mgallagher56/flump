import type { FC, ReactNode } from "react";
import { cx, type RecipeVariantProps } from "../../../styled-system/css";
import { kpiStripGrid } from "./KpiStrip.styles";

export type KpiStripVariants = RecipeVariantProps<typeof kpiStripGrid>;

export interface KpiStripProps extends KpiStripVariants {
  children: ReactNode;
  className?: string;
}

export const KpiStrip: FC<KpiStripProps> = ({ children, columns = 4, className }) => {
  return <div className={cx(kpiStripGrid({ columns }), className)}>{children}</div>;
};

export default KpiStrip;
