import { cva } from "../../../styled-system/css";

export const specimenSection = cva({
  base: {
    mb: "32px",
    p: "20px",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
  },
});

export const specimenRow = cva({
  base: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    py: "12px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    "&:last-child": {
      borderBottom: "none",
    },
  },
});
