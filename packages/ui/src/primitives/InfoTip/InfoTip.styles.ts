import { cva } from "../../../styled-system/css";

/**
 * Local trigger styling (a plain button). Later swap: use `IconButton` (size sm, variant ghost)
 * once it is on main; keep the same aria-label and Popover wiring.
 */
export const infoTipTriggerRecipe = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "24px",
    height: "24px",
    padding: 0,
    verticalAlign: "middle",
    background: "none",
    border: "none",
    borderRadius: "full",
    color: "text.muted",
    cursor: "pointer",
    flexShrink: 0,
    _hover: { color: "text.primary", backgroundColor: "surface.subtle" },
    "&[data-state='open']": { color: "primary", backgroundColor: "primary.subtle" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
    // Keep a 44px touch target on touch devices.
    "@media (pointer: coarse)": { width: "44px", height: "44px", margin: "-10px" },
  },
});

export const infoTipDefinitionRecipe = cva({
  base: { margin: 0, textStyle: "body.sm", color: "text.secondary" },
});
