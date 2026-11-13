import { sva } from "../../../styled-system/css";

/**
 * Direction C scenario zone: a sunken sand surface with a dashed outline, so it reads as
 * "not saved" through shape and words, never colour alone. Never `surface.hero`.
 */
export const scenarioZone = sva({
  slots: ["root", "header", "titleRow", "basis", "body", "footer", "reset"],
  base: {
    root: {
      display: "flex",
      flexDirection: "column",
      gap: "4",
      backgroundColor: "surface.sunken",
      borderWidth: "2px",
      borderStyle: "dashed",
      borderColor: "border.strong",
      borderRadius: "2xl",
      color: "text.primary",
      p: { base: "4", md: "6" },
    },
    header: {
      display: "flex",
      flexDirection: "column",
      gap: "2",
    },
    titleRow: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "2",
    },
    basis: {
      margin: "0",
      color: "text.secondary",
      fontSize: "sm",
      lineHeight: "1.5",
      fontVariantNumeric: "tabular-nums",
    },
    body: {
      display: "flex",
      flexDirection: "column",
      gap: "4",
      minWidth: "0",
    },
    footer: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: "3",
      fontSize: "sm",
      color: "text.secondary",
    },
    reset: {
      alignSelf: "flex-start",
    },
  },
});
