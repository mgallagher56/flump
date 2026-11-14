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
    flex: "1",
    width: "100%",
    px: "4",
    py: { base: "6", md: "12" },
    _focus: { outline: "none" },
  },
});

/** The web app's not-found card (`RouteErrorState`): same width, surface, radius and spacing. */
export const notFoundCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "3",
    maxWidth: "xl",
    width: "100%",
    mx: "auto",
    p: { base: "5", md: "7" },
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    boxShadow: "card",
  },
});

export const notFoundIllustration = cva({
  base: { display: "flex", justifyContent: "flex-start", width: "100%" },
});

export const notFoundHeading = cva({
  base: { textStyle: "heading.lg", color: "text.primary", margin: 0 },
});

export const notFoundBody = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0 },
});

export const notFoundActions = cva({
  base: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "3", mt: "2" },
});
