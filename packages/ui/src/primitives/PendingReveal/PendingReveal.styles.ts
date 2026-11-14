import { cva } from "../../../styled-system/css";

export const pendingRevealRecipe = cva({
  base: { minWidth: "0" },
  variants: {
    state: {
      // Laid out at full size but invisible, so the space is held during the delay.
      held: { visibility: "hidden" },
      shown: {},
      // Content replacing a shown placeholder fades in; never under reduced motion.
      reveal: {
        _motionSafe: {
          animationName: "fadeIn",
          animationDuration: "reveal",
          animationTimingFunction: "enter",
          animationFillMode: "both",
        },
      },
      ready: {},
    },
  },
  defaultVariants: { state: "ready" },
});
