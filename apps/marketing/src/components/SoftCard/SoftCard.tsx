import { Card, type CardElement } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import type { FC, HTMLAttributes } from "react";
import { softCard } from "./SoftCard.styles";

export interface SoftCardProps extends HTMLAttributes<HTMLElement> {
  as?: CardElement;
  /** The tone of the band the card sits on: its fill in Mint follows it. */
  band?: "card" | "canvas";
  [dataAttribute: `data-${string}`]: string | undefined;
}

/**
 * The features and area pages' card (the approved prototypes' `p11-soft-card`): the glass card
 * with the prototype's fill, edge and shadow (`softCard`). No padding of its own: the caller's class
 * sets it, with the corner. Holds no real figure (UX-GUIDELINES 12.1 tier C).
 */
export const SoftCard: FC<SoftCardProps> = ({
  as = "div",
  band = "card",
  className,
  children,
  ...rest
}) => (
  <Card
    {...rest}
    as={as}
    className={cx(softCard({ band }), className)}
    material="glass"
    padding="none"
  >
    {children}
  </Card>
);
