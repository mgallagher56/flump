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
    maxWidth: "2xl",
    mx: "auto",
    py: "24",
    px: "4",
    textAlign: "center",
  },
});

export const headingStyle = cva({
  base: { fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: "800", color: "text.primary" },
});

export const bodyStyle = cva({
  base: { fontSize: "1.1rem", color: "text.secondary", mt: "3", mb: "8" },
});

export const homeLinkStyle = cva({
  base: {
    color: "primary",
    fontWeight: "600",
    textDecoration: "underline",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});
