import { cva } from "@repo/ui/styled-system/css";

export const noticeWrap = cva({
  base: {
    display: "flex",
    justifyContent: "center",
    paddingY: { base: "10", md: "16" },
  },
});

export const noticeCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    width: "100%",
    maxWidth: "32rem",
  },
});

export const noticeHeading = cva({
  base: { textStyle: "heading.lg", color: "text.primary", margin: 0 },
});

export const noticeCopy = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});
