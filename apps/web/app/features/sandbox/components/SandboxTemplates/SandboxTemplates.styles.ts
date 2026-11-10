import { cva } from "@repo/ui/styled-system/css";

export const sandboxLayoutRecipe = cva({
  base: {
    padding: { base: "16px", md: "32px" },
    maxWidth: "1440px",
    margin: "0 auto",
  },
  variants: {
    stage: {
      1: {
        backgroundColor: "surface.canvas",
      },
      2: {
        backgroundColor: "surface.canvas",
      },
      3: {
        backgroundColor: "surface.canvas",
      },
    },
  },
  defaultVariants: {
    stage: 1,
  },
});
