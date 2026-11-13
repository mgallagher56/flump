import type { ElementType, FC, HTMLAttributes } from "react";
import { cx } from "../../../styled-system/css";
import { type TextColor, textRecipe } from "./Text.styles";

export type TextStyleName =
  | "body.lg"
  | "body.md"
  | "body.sm"
  | "label.md"
  | "label.sm"
  | "numeric.lg"
  | "numeric.md"
  | "numeric.sm";

export type TextElement = "p" | "span" | "div" | "label" | "small" | "strong" | "em" | "li";

export interface TextProps extends Omit<HTMLAttributes<HTMLElement>, "color"> {
  /** Rendered element. Defaults to `p`. */
  as?: TextElement;
  /** Maps to the preset text styles. Defaults to `body.md`. */
  textStyle?: TextStyleName;
  /** Only `text.*` and `status.*.text` colours are allowed. Defaults to `primary`. */
  color?: TextColor;
  /** Applies tabular-nums. Set it on every figure, date and percentage. */
  tabular?: boolean;
  /** Single line with an ellipsis. Give the parent a width. */
  truncate?: boolean;
  /** Clamp to this many lines. */
  lineClamp?: 1 | 2 | 3 | 4;
  /** For `as="label"`. */
  htmlFor?: string;
}

export const Text: FC<TextProps> = ({
  as = "p",
  textStyle = "body.md",
  color = "primary",
  tabular,
  truncate,
  lineClamp,
  className,
  ...props
}) => {
  const Component = as as ElementType;
  return (
    <Component
      className={cx(
        textRecipe({
          textStyle,
          color,
          tabular: tabular || undefined,
          truncate: truncate || undefined,
          lineClamp,
        }),
        className,
      )}
      {...props}
    />
  );
};

export default Text;
