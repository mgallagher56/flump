import type { FC, HTMLAttributes } from "react";
import { cx, type RecipeVariantProps } from "../../../styled-system/css";
import { exampleTagRecipe } from "./ExampleTag.styles";

export type ExampleTagVariants = RecipeVariantProps<typeof exampleTagRecipe>;

export interface ExampleTagProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children">,
    ExampleTagVariants {}

/** The tag's one approved word (STYLE-GUIDE 8.3). */
export const EXAMPLE_TAG_LABEL = "Example";

/**
 * Marks sample content as an example: every document card that shows figures carries one
 * (STYLE-GUIDE 8.3). Static text, never a control. `variant`: `paper` on paper or a card,
 * `onContrast` on the charcoal `surface.contrast` card.
 */
export const ExampleTag: FC<ExampleTagProps> = ({ variant, className, ...props }) => (
  <span className={cx(exampleTagRecipe({ variant }), className)} {...props}>
    {EXAMPLE_TAG_LABEL}
  </span>
);

export default ExampleTag;
