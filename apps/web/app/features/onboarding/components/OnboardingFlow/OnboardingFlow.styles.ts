import { sva } from "@repo/ui/styled-system/css";

export const onboardingFlowRecipe = sva({
  slots: ["page", "inner", "stepNav", "alert", "card"],
  base: {
    page: {
      // Fill the space below the app header from md up; on phones let the content set the height.
      // The app shell's <main> (root.tsx) adds paddingTop token 6 from md and, under lg, a bottom
      // padding of the bottom-bar offset plus the safe area; subtract both so the page never
      // scrolls by that padding. Keep these in step with root.tsx.
      minHeight: {
        base: "auto",
        md: "calc(100dvh - var(--app-header-offset, 0px) - token(spacing.6) - var(--app-bottom-bar-offset, 0px) - env(safe-area-inset-bottom, 0px))",
      },
      backgroundColor: "surface.canvas",
      color: "text.primary",
      display: "flex",
      justifyContent: "center",
      px: { base: "4", md: "8" },
      // The app shell already adds the gap below the header.
      pt: { base: "0", md: "4" },
      pb: { base: "4", md: "10" },
    },
    inner: { width: "100%", maxWidth: "720px", display: "flex", flexDirection: "column", gap: "5" },
    // From md up the stepper's own steps are the buttons, so this row would only repeat them.
    stepNav: {
      display: { base: "flex", md: "none" },
      flexWrap: "wrap",
      gap: "1",
      alignItems: "center",
    },
    alert: {
      display: "flex",
      alignItems: "flex-start",
      gap: "2",
      padding: "3",
      borderRadius: "xl",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: "status.danger.border",
      backgroundColor: "status.danger.bg",
      color: "status.danger.text",
      textStyle: "body.sm",
    },
    card: { display: "flex", flexDirection: "column", gap: "5" },
  },
});
