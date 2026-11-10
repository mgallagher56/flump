import { cva } from "../../../styled-system/css";

export const progressTrackRecipe = cva({
  base: {
    width: "100%",
    backgroundColor: "surface.sunken",
    borderRadius: "full",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    overflow: "hidden",
  },
});

export const progressFillRecipe = cva({
  base: {
    height: "100%",
    borderRadius: "full",
    transition: "width 0.3s ease-out",
  },
  variants: {
    variant: {
      primary: { backgroundColor: "primary" },
      positive: { backgroundColor: "status.positive.solid" },
      warning: { backgroundColor: "status.warning.solid" },
      danger: { backgroundColor: "status.danger.solid" },
    },
  },
  defaultVariants: {
    variant: "primary",
  },
});
