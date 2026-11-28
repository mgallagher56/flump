import { css } from "@repo/ui/styled-system/css";

/** The pause control as the prototype's: a pill with a hairline border on the card colour. */
export const heroPause = css({
  borderRadius: "full",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border",
  backgroundColor: "color-mix(in oklab, token(colors.surface.card) 94%, transparent)",
  // Nothing to stop before hydration or with reduced motion: no pill either.
  "&:has([data-motion-control][aria-hidden]), &:has(button:disabled)": { visibility: "hidden" },
});
