import { cva } from "../../../styled-system/css";

export const tableWrapper = cva({
  base: {
    width: "100%",
    overflowX: "auto",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
  },
});

export const tableElement = cva({
  base: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: "xs",
    color: "text.primary",
  },
});

export const theadRecipe = cva({
  base: {
    backgroundColor: "surface.subtle",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
  },
});

export const thRecipe = cva({
  base: {
    p: "10px 14px",
    fontSize: "xs",
    fontWeight: "semibold",
    color: "text.muted",
    letterSpacing: "0.01em",
    whiteSpace: "nowrap",
  },
});

export const tdRecipe = cva({
  base: {
    p: "12px 14px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    whiteSpace: "nowrap",
  },
});
