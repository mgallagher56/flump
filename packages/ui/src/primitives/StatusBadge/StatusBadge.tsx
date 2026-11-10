import type { FC, HTMLAttributes, ReactNode } from "react";
import { cx, type RecipeVariantProps } from "../../../styled-system/css";
import { statusBadgeRecipe } from "./StatusBadge.styles";

export type StatusBadgeVariants = RecipeVariantProps<typeof statusBadgeRecipe>;

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement>, StatusBadgeVariants {
  children: ReactNode;
  icon?: ReactNode;
}

export const StatusBadge: FC<StatusBadgeProps> = ({
  children,
  icon,
  className,
  variant,
  size,
  ...props
}) => {
  return (
    <span className={cx(statusBadgeRecipe({ variant, size }), className)} {...props}>
      {icon && <span style={{ display: "inline-flex", alignItems: "center" }}>{icon}</span>}
      {children}
    </span>
  );
};

export default StatusBadge;
