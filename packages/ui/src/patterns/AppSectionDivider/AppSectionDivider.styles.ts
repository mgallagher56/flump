import { cva } from "../../../styled-system/css";

export const sectionDividerContainer = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    py: "12px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    my: "8px",
    width: "100%",
  },
});

export const sectionDividerLabel = cva({
  base: {
    fontFamily: "display",
    fontSize: "xs",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "text.primary",
    margin: "0",
  },
});
