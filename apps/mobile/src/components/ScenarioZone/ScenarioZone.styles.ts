import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

/**
 * The zone sits on the card surface with the section border, never the hero surface (a scenario
 * outcome is not a saved figure, AGENTS.md section 3).
 */
export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      alignSelf: "stretch",
      borderWidth: 1,
      borderRadius: theme.radii.card,
      borderColor: theme.colors["border.section"],
      backgroundColor: theme.colors["surface.card"],
      padding: theme.spacing["4"],
      gap: theme.spacing["3"],
    },
    header: { gap: theme.spacing["2"] },
    toggle: { flexDirection: "row", alignItems: "center", gap: theme.spacing["2"] },
    toggleLabel: { flexShrink: 1 },
    down: { transform: [{ rotate: "90deg" }] },
    up: { transform: [{ rotate: "-90deg" }] },
    content: { gap: theme.spacing["4"] },
    inputs: { gap: theme.spacing["3"] },
  });
