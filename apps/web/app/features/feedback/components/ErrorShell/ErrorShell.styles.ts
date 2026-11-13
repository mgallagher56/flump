import { cva } from "@repo/ui/styled-system/css";

export const shellRoot = cva({
  base: { minHeight: "100vh", backgroundColor: "surface.canvas", color: "text.primary" },
});

export const shellHeader = cva({
  base: {
    display: "flex",
    alignItems: "center",
    paddingX: { base: "16px", md: "24px" },
    paddingY: "12px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    backgroundColor: "surface.card",
  },
});

export const shellMain = cva({
  base: {
    maxWidth: "1536px",
    marginX: "auto",
    outline: "none",
  },
});
