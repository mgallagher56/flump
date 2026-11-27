import { useTiltLight } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import type { FC, ReactNode } from "react";
import { tiltLight } from "./TiltLight.styles";

export interface TiltLightProps {
  /** The element to render: a list item inside a list, otherwise a `div`. */
  as?: "div" | "li";
  className?: string;
  children: ReactNode;
  /** False keeps the light but never tilts (a card holding a figure the reader is changing). */
  tilt?: boolean;
  /** Data attributes for the wrapper, such as a test id. */
  [dataAttribute: `data-${string}`]: string | undefined;
}

/**
 * The tilt-and-light wiring for a marketing card (STYLE-GUIDE 2.7): wrap a card, and the pointer
 * light and a tilt of up to six degrees follow the mouse. Touch and reduced motion get a still card.
 * Never around a card that holds a real figure (the apps, UX-GUIDELINES 12.1 tier C).
 */
export const TiltLight: FC<TiltLightProps> = ({
  as = "div",
  className,
  children,
  tilt = true,
  ...data
}) => {
  const divRef = useTiltLight<HTMLDivElement>({ tilt });
  const liRef = useTiltLight<HTMLLIElement>({ tilt });
  const classes = cx(tiltLight, className);
  return as === "li" ? (
    <li {...data} className={classes} ref={liRef}>
      {children}
    </li>
  ) : (
    <div {...data} className={classes} ref={divRef}>
      {children}
    </div>
  );
};
