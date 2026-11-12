import type { LucideIcon } from "lucide-react";
import type { FC, SVGAttributes } from "react";
import { ICON_STROKE_WIDTH, iconRecipe, iconSizePx } from "./Icon.styles";

export type IconSize = keyof typeof iconSizePx;

export type IconProps = Omit<
  SVGAttributes<SVGSVGElement>,
  "children" | "aria-hidden" | "aria-label" | "role"
> & {
  /** A Lucide icon component, e.g. `import { TrendingUp } from "lucide-react"`. */
  icon: LucideIcon;
  /** `sm` 16px, `md` 20px (default), `lg` 24px. */
  size?: IconSize;
  /** Stroke width, defaults to the design token (1.75). */
  strokeWidth?: number;
  /**
   * Accessible name. Omit for decorative icons (rendered `aria-hidden`). Provide it when the icon
   * is the only content that conveys meaning (role="img"). Icon-only buttons should put the label
   * on the button instead and leave the icon decorative.
   */
  label?: string;
};

export const Icon: FC<IconProps> = ({
  icon: LucideComponent,
  size = "md",
  strokeWidth = ICON_STROKE_WIDTH,
  label,
  className,
  ...rest
}) => {
  const classes = [iconRecipe({ size }), className].filter(Boolean).join(" ");
  const a11y = label
    ? ({ role: "img", "aria-label": label } as const)
    : ({ "aria-hidden": true, focusable: false } as const);
  return (
    <LucideComponent
      {...rest}
      {...a11y}
      className={classes}
      size={iconSizePx[size]}
      strokeWidth={strokeWidth}
    />
  );
};

export default Icon;
