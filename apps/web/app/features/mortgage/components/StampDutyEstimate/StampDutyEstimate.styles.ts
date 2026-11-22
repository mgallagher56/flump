import { css, cva } from "@repo/ui/styled-system/css";

const numeric = { fontVariantNumeric: "tabular-nums" } as const;

export const stampDutyRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "3",
    width: "100%",
    paddingTop: "4",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
  },
});

export const stampDutyPanel = css({
  display: "flex",
  flexDirection: "column",
  gap: "4",
  width: "100%",
  ...numeric,
});

export const stampDutyLine = css({
  textStyle: "body.md",
  color: "text.primary",
  margin: 0,
  ...numeric,
});

export const stampDutyFigure = css({
  textStyle: "numeric.md",
  color: "text.primary",
  ...numeric,
});

export const stampDutyNote = css({
  textStyle: "body.sm",
  color: "text.secondary",
  margin: 0,
  ...numeric,
});
