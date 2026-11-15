import { cva } from "@repo/ui/styled-system/css";

export const pageShell = cva({
  base: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "surface.canvas",
    color: "text.primary",
  },
});

export const mainContent = cva({
  base: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    outline: "none",
  },
});

export const container = cva({
  base: {
    width: "100%",
    maxWidth: "4xl",
    mx: "auto",
    px: { base: "4", md: "6", lg: "8" },
    py: { base: "8", md: "12" },
    display: "flex",
    flexDirection: "column",
    gap: { base: "10", md: "14" },
  },
});

export const previewSection = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "3",
  },
});

export const sectionDescription = cva({
  base: {
    textStyle: "body.md",
    color: "text.secondary",
    margin: 0,
    maxWidth: "2xl",
  },
});

export const ctaBlock = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "4",
    p: { base: "6", md: "8" },
    borderRadius: "2xl",
    backgroundColor: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    boxShadow: "sm",
  },
});

export const ctaTitle = cva({
  base: {
    textStyle: "heading.md",
    color: "text.primary",
    margin: 0,
    fontWeight: "bold",
  },
});

export const ctaText = cva({
  base: {
    textStyle: "body.md",
    color: "text.secondary",
    margin: 0,
    maxWidth: "md",
  },
});
