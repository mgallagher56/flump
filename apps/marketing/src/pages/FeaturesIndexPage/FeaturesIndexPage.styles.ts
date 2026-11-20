import { cva } from "@repo/ui/styled-system/css";

export const pageShell = cva({
  base: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "surface.canvas",
  },
});

export const mainContent = cva({
  base: { flex: "1", px: "4", py: { base: "12", md: "16" }, _focus: { outline: "none" } },
});

export const container = cva({
  base: { maxWidth: "6xl", mx: "auto", display: "flex", flexDirection: "column", gap: "10" },
});

export const headerBlock = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", maxWidth: "3xl" },
});

export const heading = cva({
  base: { textStyle: "display", color: "text.primary", margin: 0 },
});

export const lead = cva({
  base: { textStyle: { base: "body.md", md: "body.lg" }, color: "text.secondary", margin: 0 },
});

export const introText = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

export const ctaRow = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "3" },
});
