import { sva } from "@repo/ui/styled-system/css";

/**
 * Local copy of the shared ScenarioZone look (E15 scenario-zone spec) until the shared pattern
 * from the components lane lands, then this file is swapped for it. A sunken surface with a dashed
 * outline reads as "not saved" through shape and words, never colour alone. Never `surface.hero`.
 */
export const scenarioZone = sva({
  slots: ["root", "header", "titleRow", "title", "basis", "body", "footer", "reset"],
  base: {
    root: {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      backgroundColor: "surface.sunken",
      borderWidth: "2px",
      borderStyle: "dashed",
      borderColor: "border.strong",
      borderRadius: "2xl",
      color: "text.primary",
      minWidth: 0,
      p: { base: "16px", md: "24px" },
      scrollMarginTop: "16px",
    },
    header: { display: "flex", flexDirection: "column", gap: "8px" },
    titleRow: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
    },
    title: { textStyle: "heading.md", color: "text.primary", margin: 0 },
    basis: {
      margin: 0,
      color: "text.secondary",
      textStyle: "body.sm",
      fontVariantNumeric: "tabular-nums",
    },
    body: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
    footer: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: "12px",
      textStyle: "body.sm",
      color: "text.secondary",
    },
    reset: { alignSelf: "flex-start" },
  },
});
