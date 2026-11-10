import type { HTMLAttributes } from "react";
import { cx, type RecipeVariantProps } from "../../../styled-system/css";
import { cardRecipe } from "./Card.styles";

export type CardVariants = RecipeVariantProps<typeof cardRecipe>;

export type CardProps = HTMLAttributes<HTMLDivElement> & CardVariants;

export const Card = ({ className, elevation, padding, ...props }: CardProps) => {
  return <div className={cx(cardRecipe({ elevation, padding }), className)} {...props} />;
};

export default Card;
