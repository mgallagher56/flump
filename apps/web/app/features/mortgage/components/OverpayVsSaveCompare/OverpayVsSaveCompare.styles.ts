import { css, cva } from "@repo/ui/styled-system/css";

const numeric = { fontVariantNumeric: "tabular-nums" } as const;

/** Controls and results sit on the scenario zone surface: no cards (E16 PR 6). */
export const controlPanel = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

export const resultsBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0, ...numeric },
});

/** The savings rate after the chosen tax, one quiet line under the tax choice. */
export const netRateLine = css({
  textStyle: "body.sm",
  color: "text.secondary",
  m: 0,
  ...numeric,
});

export const chartWrapper = css({
  height: "260px",
  width: "100%",
  minWidth: 0,
  mt: "8px",
  "& .recharts-cartesian-axis-tick-value": {
    fill: "text.muted",
  },
});

export const dataTable = css({
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "xs",
  color: "text.primary",
  "& caption": { textAlign: "left", color: "text.muted", pb: "8px" },
  "& th, & td": { textAlign: "left", p: "6px 8px" },
});

export const dataCell = css({ ...numeric });
