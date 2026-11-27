import type { FC, HTMLAttributes } from "react";
import { cx, type RecipeVariantProps } from "../../../styled-system/css";
import { exampleTagRecipe } from "./ExampleTag.styles";

export type ExampleTagVariants = RecipeVariantProps<typeof exampleTagRecipe>;

export interface ExampleTagProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children">,
    ExampleTagVariants {
  /** The words on the tag. Defaults to "Example"; keep it short and in sentence case. */
  label?: string;
}

/**
 * Marks sample content as an example: every document card that shows figures carries one
 * (STYLE-GUIDE 8.3). Static text, never a control.
 */
export const ExampleTag: FC<ExampleTagProps> = ({
  label = "Example",
  tone,
  className,
  ...props
}) => (
  <span className={cx(exampleTagRecipe({ tone }), className)} {...props}>
    {label}
  </span>
);

export default ExampleTag;
