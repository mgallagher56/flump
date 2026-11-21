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

export const multipleGroup = css({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  minWidth: 0,
});

export const multipleLabel = css({
  textStyle: "label.md",
  color: "text.primary",
});

export const multipleRow = css({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  ...numeric,
});

export const multipleSeparator = css({
  textStyle: "body.sm",
  color: "text.secondary",
  flexShrink: 0,
});

export const multipleInputWrap = css({
  flex: "1 1 0",
  minWidth: 0,
});

export const multipleHint = css({
  textStyle: "body.sm",
  color: "text.muted",
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
