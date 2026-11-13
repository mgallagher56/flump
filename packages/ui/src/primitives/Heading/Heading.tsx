import type { FC, HTMLAttributes } from "react";
import { cx } from "../../../styled-system/css";
import type { TextColor } from "../Text/Text.styles";
import { headingRecipe } from "./Heading.styles";

export type HeadingElement = "h1" | "h2" | "h3" | "h4";
export type HeadingSize = "display" | "xl" | "lg" | "md" | "sm";

/** Visual size used when `size` is not given. */
export const defaultHeadingSize: Record<HeadingElement, HeadingSize> = {
  h1: "xl",
  h2: "lg",
  h3: "md",
  h4: "sm",
};

export interface HeadingProps extends Omit<HTMLAttributes<HTMLHeadingElement>, "color"> {
  /** Semantic level. Pick for document outline, not looks. Defaults to `h2`. */
  as?: HeadingElement;
  /** Visual size, independent of `as`. Defaults from the level (h1 xl, h2 lg, h3 md, h4 sm). */
  size?: HeadingSize;
  /** Only `text.*` and `status.*.text` colours are allowed. Defaults to `primary`. */
  color?: TextColor;
  /** Apply when the heading contains figures or dates. */
  tabular?: boolean;
}

/** Plain, coach-like, sentence-case headings: "Where you stand", "Over time and by account". */
export const Heading: FC<HeadingProps> = ({
  as: Component = "h2",
  size,
  color = "primary",
  tabular,
  className,
  ...props
}) => (
  <Component
    className={cx(
      headingRecipe({
        size: size ?? defaultHeadingSize[Component],
        color,
        tabular: tabular || undefined,
      }),
      className,
    )}
    {...props}
  />
);

export default Heading;
