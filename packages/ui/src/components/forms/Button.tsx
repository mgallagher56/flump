import { Slot } from "@radix-ui/react-slot";
import { cva, cx, type RecipeVariantProps } from "@repo/ui/styled-system/css";
import type { ComponentProps } from "react";

const buttonRecipe = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    rounded: "full",
    fontWeight: "medium",
    transition: "all 0.2s",
    cursor: "pointer",
    px: "5",
    py: "3",
    fontSize: "sm",
    lineHeight: "1",
    _disabled: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "primary",
      outlineOffset: "2px",
    },
  },
  variants: {
    variant: {
      primary: {
        bg: "primary",
        color: "primary.foreground",
        _hover: { bg: "primary.hover" },
      },
      secondary: {
        bg: "secondary",
        color: "secondary.foreground",
        _hover: { bg: "secondary.hover" },
      },
      outline: {
        bg: "background",
        color: "text.primary",
        border: "1px solid",
        borderColor: "border",
        _hover: { bg: "accent", color: "accent.foreground" },
      },
      ghost: {
        bg: "transparent",
        color: "text.primary",
        _hover: { bg: "accent", color: "accent.foreground" },
      },
      link: {
        bg: "transparent",
        color: "primary",
        textUnderlineOffset: "4px",
        _hover: { textDecoration: "underline" },
        height: "auto",
        px: "0",
        py: "0",
      },
      destructive: {
        bg: "destructive",
        color: "destructive.foreground",
        _hover: { bg: "destructive.hover" },
      },
    },
    size: {
      sm: { px: "4", py: "2", fontSize: "xs" },
      md: { px: "6", py: "3", fontSize: "sm" },
      lg: { px: "8", py: "4", fontSize: "md" },
      icon: { h: "10", w: "10", px: "0" },
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

export const buttonVariants = buttonRecipe;

type ButtonVariants = RecipeVariantProps<typeof buttonRecipe>;

export type ButtonProps = ComponentProps<"button"> &
  ButtonVariants & {
    asChild?: boolean;
  };

export const Button = ({ asChild, className, variant, size, ...props }: ButtonProps) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cx(buttonRecipe({ variant, size }), className)} {...props} />;
};
