import { sva } from "@repo/ui/styled-system/css";

export const onboardingFlowRecipe = sva({
  slots: ["page", "inner", "stepNav", "alert", "card"],
  base: {
    page: {
      // Fill the space below the app header from md up; on phones let the content set the height.
      minHeight: { base: "auto", md: "calc(100dvh - var(--app-header-offset, 0px))" },
      backgroundColor: "surface.canvas",
      color: "text.primary",
      display: "flex",
      justifyContent: "center",
      px: { base: "4", md: "8" },
      py: { base: "4", md: "10" },
    },
    inner: { width: "100%", maxWidth: "720px", display: "flex", flexDirection: "column", gap: "5" },
    stepNav: { display: "flex", flexWrap: "wrap", gap: "1", alignItems: "center" },
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
