import { cva } from "@repo/ui/styled-system/css";

/** The sheet body: the rule, any save error, then the list. */
export const panelBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "3" },
});

export const panelDescription = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0 },
});

export const panelList = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
});

/** A row: the label (checkbox, icon, words) then, when the order can change, the move buttons. */
export const panelItem = cva({
  base: { display: "flex", alignItems: "center", gap: "4px", minWidth: 0 },
});

export const panelRow = cva({
  base: {
    flex: "1 1 auto",
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minHeight: "touch",
    px: "12px",
    py: "8px",
    borderRadius: "md",
    cursor: "pointer",
    _hover: { backgroundColor: "surface.subtle" },
  },
});

export const panelCheckbox = cva({
  base: {
    width: "18px",
    height: "18px",
    flexShrink: 0,
    accentColor: "primary",
    cursor: "pointer",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

export const panelRowText = cva({
  base: { display: "flex", flexDirection: "column", minWidth: 0 },
});

/** The section's name with its showing status beside it, wrapping under it when narrow. */
export const panelRowTitle = cva({
  base: { display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: "8px" },
});

/** Move up and move down, side by side, 44px touch targets on a coarse pointer. */
export const panelMoveGroup = cva({
  base: { display: "flex", flexShrink: 0, gap: "2px" },
});

/** The reset button, at the end of the list. */
export const panelOrderFooter = cva({
  base: { display: "flex", justifyContent: "flex-end" },
});

export const panelRowLabel = cva({
  base: { textStyle: "label.md", color: "text.primary" },
});

export const panelRowHint = cva({
  base: { textStyle: "body.sm", color: "text.muted" },
});

/** Whether a ticked section shows now; quiet text beside the section's name. */
export const panelRowStatus = cva({
  base: {
    flexShrink: 0,
    textStyle: "label.sm",
    whiteSpace: "nowrap",
  },
  variants: {
    shown: {
      true: { color: "text.primary" },
      false: { color: "text.muted" },
    },
  },
});
