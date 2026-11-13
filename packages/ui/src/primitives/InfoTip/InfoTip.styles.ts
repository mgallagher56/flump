import { cva } from "../../../styled-system/css";

/**
 * Compact inline sizing layered on `IconButton` (ghost, sm). `&&` raises specificity so these win
 * over the button's own size classes regardless of stylesheet order.
 */
export const infoTipTriggerRecipe = cva({
  base: {
    verticalAlign: "middle",
    borderRadius: "full",
    "&&": {
      width: "24px",
      height: "24px",
      padding: "0",
      minWidth: "0",
      minHeight: "0",
      color: "text.muted",
    },
    "&&:hover": { color: "text.primary" },
    "&&[data-state='open']": { color: "primary", backgroundColor: "primary.subtle" },
    // Keep a 44px touch target on touch devices.
    "@media (pointer: coarse)": {
      "&&": {
        width: "touch",
        height: "touch",
        minWidth: "touch",
        minHeight: "touch",
        margin: "-10px",
      },
    },
  },
});

export const infoTipDefinitionRecipe = cva({
  base: { margin: 0, textStyle: "body.sm", color: "text.secondary" },
});
