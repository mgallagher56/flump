import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps } from "react";
import { cx, type RecipeVariantProps } from "../../../styled-system/css";
import { buttonRecipe } from "./Button.styles";

export const buttonVariants = buttonRecipe;
export type ButtonVariants = RecipeVariantProps<typeof buttonRecipe>;

export type ButtonProps = ComponentProps<"button"> &
  ButtonVariants & {
    asChild?: boolean;
  };

export const Button = ({ asChild, className, variant, size, ...props }: ButtonProps) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cx(buttonRecipe({ variant, size }), className)} {...props} />;
};

export default Button;
