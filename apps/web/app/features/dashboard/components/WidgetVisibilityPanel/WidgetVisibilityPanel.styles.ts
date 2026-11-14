import { cva } from "@repo/ui/styled-system/css";

export const panelOverlay = cva({
  base: {
    position: "fixed",
    inset: 0,
    backgroundColor: "surface.scrim",
    zIndex: 50,
  },
});

export const panelContent = cva({
  base: {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    width: "calc(100vw - 32px)",
    maxWidth: "480px",
    maxHeight: "calc(100vh - 32px)",
    overflowY: "auto",
    p: { base: "20px", md: "24px" },
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    boxShadow: "overlay",
    color: "text.primary",
    zIndex: 60,
    outline: "none",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

export const panelTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
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

export const panelFooter = cva({
  base: { display: "flex", justifyContent: "flex-end", marginTop: "8px" },
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
