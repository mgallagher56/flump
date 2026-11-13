import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps, MouseEvent } from "react";
import { cx, type RecipeVariantProps } from "../../../styled-system/css";
import {
  buttonContentRecipe,
  buttonRecipe,
  buttonSpinnerRecipe,
  iconButtonRecipe,
} from "./Button.styles";

export const buttonVariants = buttonRecipe;
export type ButtonVariants = RecipeVariantProps<typeof buttonRecipe>;

export type ButtonProps = ComponentProps<"button"> &
  ButtonVariants & {
    /** Render the single child element (e.g. a router `<Link>`) with the button styles. */
    asChild?: boolean;
    /**
     * Shows a spinner in place of the label without changing the button width. Sets
     * `aria-busy` and `aria-disabled`, stays focusable and ignores clicks until it clears.
     */
    pending?: boolean;
  };

export const Button = ({
  asChild,
  className,
  variant,
  size,
  pending = false,
  children,
  onClick,
  ...props
}: ButtonProps) => {
  const classes = cx(buttonRecipe({ variant, size }), className);
  const busy = pending ? ({ "aria-busy": true, "aria-disabled": true } as const) : {};
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (pending) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  if (asChild) {
    return (
      <Slot className={classes} {...busy} onClick={handleClick} {...props}>
        {children}
      </Slot>
    );
  }
  return (
    <button className={classes} {...busy} onClick={handleClick} {...props}>
      <span className={buttonContentRecipe({ pending })}>{children}</span>
      {pending ? <span aria-hidden="true" className={buttonSpinnerRecipe()} /> : null}
    </button>
  );
};

export type IconButtonProps = Omit<ButtonProps, "asChild" | "size" | "aria-label"> & {
  /** Required accessible name, used as `aria-label`. */
  label: string;
  size?: "sm" | "md" | "lg";
  /** Reserved for the Tooltip primitive (T2.7); accepted but not rendered yet. */
  tooltip?: string;
};

/** Icon-only button. Pass a decorative icon as the child; `label` names it for assistive tech. */
export const IconButton = ({
  label,
  size = "md",
  variant = "ghost",
  className,
  tooltip: _tooltip,
  ...props
}: IconButtonProps) => (
  <Button
    {...props}
    aria-label={label}
    className={cx(iconButtonRecipe({ size }), className)}
    size={size}
    variant={variant}
  />
);

export type ButtonLinkProps = ComponentProps<"a"> &
  Omit<ButtonVariants, "size"> & {
    size?: "sm" | "md" | "lg";
    /** Style the single child (e.g. a router `<Link to>`) instead of rendering an `<a>`. */
    asChild?: boolean;
  };

/**
 * An anchor styled as a button. Pass `href` for a plain link, or `asChild` with your router's
 * link component; this package never imports a router.
 */
export const ButtonLink = ({
  asChild,
  className,
  variant,
  size,
  children,
  ...props
}: ButtonLinkProps) => {
  const Comp = asChild ? Slot : "a";
  return (
    <Comp className={cx(buttonRecipe({ variant, size }), className)} {...props}>
      {children}
    </Comp>
  );
};

export default Button;
