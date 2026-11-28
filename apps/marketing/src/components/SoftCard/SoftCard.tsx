import { Card, type CardElement, type CardVariants } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import type { FC, HTMLAttributes } from "react";
import { softCard } from "./SoftCard.styles";

export interface SoftCardProps extends HTMLAttributes<HTMLElement> {
  as?: CardElement;
  /** The tone of the band the card sits on: its fill in Mint follows it. */
  band?: "card" | "canvas";
  /**
   * The corner, from the radius scale (STYLE-GUIDE section 5): `panel` (20px), `tray` (24px) or
   * `showcase` (28px), as the approved prototypes have it. Set here, never by the caller's class,
   * which the base card's own corner would beat.
   */
  radius: NonNullable<CardVariants["radius"]>;
  [dataAttribute: `data-${string}`]: string | undefined;
}

/**
 * The features and area pages' card (the approved prototypes' `p11-soft-card`): the glass card
 * with the prototype's fill, edge and shadow (`softCard`) and the corner it is given. No padding of
 * its own: the caller's class sets it. Holds no real figure (UX-GUIDELINES 12.1 tier C).
 */
export const SoftCard: FC<SoftCardProps> = ({
  as = "div",
  band = "card",
  className,
  children,
  radius,
  ...rest
}) => (
  <Card
    {...rest}
    as={as}
    className={cx(softCard({ band }), className)}
    material="glass"
    padding="none"
    radius={radius}
  >
    {children}
  </Card>
);
