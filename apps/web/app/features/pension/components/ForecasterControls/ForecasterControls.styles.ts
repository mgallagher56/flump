import { cva } from "@repo/ui/styled-system/css";

/** Sits on the zone surface: no nested card (E16 PR 2 handover). */
export const controlsPanel = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: 0 },
});

export const toggleList = cva({
  base: { display: "flex", flexDirection: "column", gap: "2", pt: "2" },
});

export const toggleRow = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    gap: "2.5",
    textStyle: "body.md",
    color: "text.primary",
    cursor: "pointer",
    minHeight: "touch",
    "& input": { marginTop: "1", width: "18px", height: "18px", accentColor: "primary.solid" },
  },
});

export const toggleHint = cva({
  base: {
    display: "block",
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});
