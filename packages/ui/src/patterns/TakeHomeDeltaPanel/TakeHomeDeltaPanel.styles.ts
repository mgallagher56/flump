import { cva } from "../../../styled-system/css";

export const deltaPanelRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    padding: { base: "4", md: "5" },
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
    color: "text.primary",
  },
});

export const deltaPanelHeader = cva({
  base: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2" },
});

export const deltaPanelTitle = cva({
  base: { textStyle: "heading.sm", color: "text.primary", margin: "0", marginRight: "auto" },
});

export const deltaPanelSentence = cva({
  base: {
    textStyle: "body.lg",
    color: "text.primary",
    margin: "0",
    fontVariantNumeric: "tabular-nums",
  },
});

export const deltaPanelNumeric = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});

export const deltaPanelAssumptions = cva({
  base: { display: "flex", flexDirection: "column", gap: "2" },
});

export const deltaPanelAssumptionsTitle = cva({
  base: { textStyle: "label.md", color: "text.secondary", margin: "0" },
});

export const deltaPanelAssumptionsList = cva({
  base: {
    margin: "0",
    paddingLeft: "5",
    listStyleType: "disc",
    display: "flex",
    flexDirection: "column",
    gap: "1",
    textStyle: "body.sm",
    color: "text.secondary",
  },
});

export const deltaPanelUnverified = cva({
  base: { color: "status.warning.text", fontWeight: "medium" },
});

/** The unverified sentence when the page's one notice lives elsewhere: quiet text, no status fill. */
export const deltaPanelUnverifiedNote = cva({
  base: { margin: "0", textStyle: "body.sm", color: "text.secondary" },
});
