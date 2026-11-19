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

export const panelRow = cva({
  base: {
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

export const panelRowLabel = cva({
  base: { textStyle: "label.md", color: "text.primary" },
});

export const panelRowHint = cva({
  base: { textStyle: "body.sm", color: "text.muted" },
});

/** Whether a ticked section shows now; quiet text, pushed to the row's end. */
export const panelRowStatus = cva({
  base: {
    marginLeft: "auto",
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
