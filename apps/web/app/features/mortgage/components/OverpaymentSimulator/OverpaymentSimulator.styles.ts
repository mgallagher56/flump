import { css, cva } from "@repo/ui/styled-system/css";

/** Controls sit on the scenario zone surface: no card chrome (E16 PR 6, no nested cards). */
export const controlsBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

export const chartWrap = cva({
  base: {
    height: "300px",
    width: "100%",
    minWidth: 0,
    marginTop: "16px",
    fontVariantNumeric: "tabular-nums",
    "& .recharts-cartesian-axis-tick-value": {
      fill: "text.muted",
      fontVariantNumeric: "tabular-nums",
    },
    "& .recharts-default-tooltip": {
      backgroundColor: "surface.card!",
      borderColor: "border!",
      color: "text.primary!",
      fontVariantNumeric: "tabular-nums",
    },
    "& .recharts-tooltip-label": { color: "text.muted!" },
  },
});

/** A series name drawn at its line end (R2-2 direct labels), in place of a swatch legend. */
export const dataTable = cva({
  base: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "xs",
    "& caption": { textAlign: "left", color: "text.muted", paddingBottom: "8px" },
    "& th": { textAlign: "left", color: "text.secondary", fontWeight: "semibold" },
    "& th, & td": {
      padding: "4px 8px",
      borderBottomWidth: "1px",
      borderBottomStyle: "solid",
      borderBottomColor: "border.subtle",
    },
  },
});

export const dataCell = css({
  fontVariantNumeric: "tabular-nums",
});

/** Results column: the outcome first, then two supporting figures and the chart. */
export const outcomeColumn = cva({
  base: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: { base: "12px", md: "16px" },
    fontVariantNumeric: "tabular-nums",
  },
});
