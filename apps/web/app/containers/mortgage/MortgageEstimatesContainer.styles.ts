import { css, cva } from "@repo/ui/styled-system/css";

export const pageRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    minWidth: 0,
  },
});

export const savedSection = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minWidth: 0,
  },
});

export const tabPanel = cva({
  base: {
    paddingTop: "16px",
    minWidth: 0,
  },
});

export const standingNotice = css({
  textStyle: "body.sm",
  color: "text.secondary",
  margin: "0 0 8px",
});
