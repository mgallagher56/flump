import { Check, CircleAlert, Info, TriangleAlert } from "lucide-react";
import type { FC, HTMLAttributes, ReactNode } from "react";
import { cx, type RecipeVariantProps } from "../../../styled-system/css";
import { Icon } from "../Icon";
import { statusBadgeIcon, statusBadgeRecipe } from "./StatusBadge.styles";

export type StatusBadgeVariants = RecipeVariantProps<typeof statusBadgeRecipe>;

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement>, StatusBadgeVariants {
  children: ReactNode;
  /** A custom icon. It wins over `showIcon`. Keep it decorative: the words carry the meaning. */
  icon?: ReactNode;
  /**
   * Adds the standard icon for the tone (tick, circle alert, triangle alert, info), so status is
   * never conveyed by colour alone. `neutral` and `brand` have no standard icon.
   */
  showIcon?: boolean;
}

const toneIcons = {
  positive: Check,
  warning: CircleAlert,
  danger: TriangleAlert,
  info: Info,
} as const;

export const StatusBadge: FC<StatusBadgeProps> = ({
  children,
  icon,
  showIcon = false,
  className,
  variant,
  size,
  ...props
}) => {
  const toneIcon =
    showIcon && variant && variant in toneIcons
      ? toneIcons[variant as keyof typeof toneIcons]
      : undefined;
  const resolvedIcon = icon ?? (toneIcon ? <Icon icon={toneIcon} size="sm" /> : null);
  return (
    <span className={cx(statusBadgeRecipe({ variant, size }), className)} {...props}>
      {resolvedIcon ? <span className={statusBadgeIcon()}>{resolvedIcon}</span> : null}
      {children}
    </span>
  );
};

export default StatusBadge;
