import { css, cva } from "@repo/ui/styled-system/css";

const numeric = { fontVariantNumeric: "tabular-nums" } as const;

export const controlsColumn = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minWidth: 0,
  },
});

export const staleNotice = css({
  textStyle: "body.sm",
  color: "text.secondary",
  margin: 0,
});

export const depositToggleRow = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "12px",
});

export const depositPanel = css({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  width: "100%",
  paddingTop: "8px",
  borderTopWidth: "1px",
  borderTopStyle: "solid",
  borderTopColor: "border.subtle",
  ...numeric,
});
