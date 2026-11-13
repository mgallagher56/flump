import { cva } from "@repo/ui/styled-system/css";

export const pageRoot = cva({
  base: { minHeight: "100vh", display: "flex", flexDirection: "column" },
});

export const pageContent = cva({
  base: {
    flex: 1,
    width: "100%",
    maxWidth: "5xl",
    margin: "0 auto",
    paddingBlock: { base: "24px", md: "48px" },
    paddingInline: { base: "16px", md: "24px" },
    display: "flex",
    flexDirection: "column",
    gap: { base: "24px", md: "32px" },
  },
});
