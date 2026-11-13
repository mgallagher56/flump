import type { ElementType, HTMLAttributes } from "react";
import { cx, type RecipeVariantProps } from "../../../styled-system/css";
import { cardRecipe } from "./Card.styles";

export type CardVariants = RecipeVariantProps<typeof cardRecipe>;

export type CardElement = "div" | "section" | "article" | "aside" | "li";

export type CardProps = HTMLAttributes<HTMLElement> &
  CardVariants & {
    /** Rendered element. Use `section` or `article` when the card has its own heading. */
    as?: CardElement;
  };

export const Card = ({ as = "div", className, elevation, padding, tone, ...props }: CardProps) => {
  const Component = as as ElementType;
  return (
    <Component className={cx(cardRecipe({ elevation, padding, tone }), className)} {...props} />
  );
};

export default Card;
