import { css } from "@repo/ui/styled-system/css";

/**
 * Prototype 11's "1b" hover: the light follows the pointer and the card tilts toward it, up to six
 * degrees (`useTiltLight` writes the custom properties, mouse only, never with reduced motion), and
 * the card lifts with a deeper shadow. No border change and no top border on hover (STYLE-GUIDE 2.7).
 */
export const tiltLight = css({
  position: "relative",
  display: "grid",
  borderRadius: "card",
  transform: "perspective(900px) rotateX(var(--tilt-rx, 0deg)) rotateY(var(--tilt-ry, 0deg))",
  _motionSafe: {
    transitionProperty: "transform, box-shadow",
    transitionDuration: "marketing.hover",
    transitionTimingFunction: "marketing.calm",
  },
  // The moving light: a soft mint gradient that follows the pointer, over the card.
  _after: {
    content: '""',
    position: "absolute",
    inset: "0",
    borderRadius: "inherit",
    pointerEvents: "none",
    backgroundImage:
      "radial-gradient(320px circle at var(--light-x, 50%) var(--light-y, 0%), color-mix(in oklab, token(colors.primary) 16%, transparent), color-mix(in oklab, token(colors.primary) 6%, transparent) 40%, transparent 72%)",
    opacity: "0",
    _motionSafe: {
      transitionProperty: "opacity",
      transitionDuration: "marketing.hover",
      transitionTimingFunction: "marketing.calm",
    },
  },
  "&[data-tilt-light=on]::after": { opacity: "1" },
  "&[data-tilt-light=on]": { _motionSafe: { boxShadow: "floating" } },
});
