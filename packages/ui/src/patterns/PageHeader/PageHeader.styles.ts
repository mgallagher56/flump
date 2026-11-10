import { cva } from "../../../styled-system/css";

export const pageHeaderContainer = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "16px",
    width: "100%",
    mb: "20px",
  },
});

export const pageHeaderTitle = cva({
  base: {
    fontFamily: "display",
    fontSize: { base: "22px", md: "28px" },
    fontWeight: "bold",
    color: "text.primary",
    letterSpacing: "-0.02em",
    margin: "0",
    lineHeight: "1.2",
  },
});

export const pageHeaderSubtitle = cva({
  base: {
    fontSize: "sm",
    color: "text.muted",
    margin: "0",
    mt: "4px",
    maxWidth: "720px",
    lineHeight: "1.5",
  },
});
