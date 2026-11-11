import type { AnchorHTMLAttributes, FC, HTMLAttributes } from "react";
import { cx } from "../../../styled-system/css";
import { visuallyHiddenRecipe } from "./VisuallyHidden.styles";

export type VisuallyHiddenElement = "span" | "div" | "caption" | "h2" | "a";

export interface VisuallyHiddenProps
  extends HTMLAttributes<HTMLElement>,
    Pick<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  as?: VisuallyHiddenElement;
  focusable?: boolean;
}

export const VisuallyHidden: FC<VisuallyHiddenProps> = ({
  as: Tag = "span",
  focusable = false,
  className,
  children,
  ...props
}) => (
  <Tag className={cx(visuallyHiddenRecipe({ focusable }), className)} {...props}>
    {children}
  </Tag>
);

export default VisuallyHidden;
