import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

/** Web's two banner looks: rates carried over from another year, or announced and not confirmed. */
export type TaxRatesStatusBannerKind = "fallback" | "provisional";

/** The status colours web's `TaxRatesStatusBanner` uses; each text and fill pair is in the matrix. */
export const KIND_COLOURS = {
  fallback: {
    fill: "status.warning.bg",
    edge: "status.warning.border",
    text: "warning",
  },
  provisional: {
    fill: "status.info.bg",
    edge: "status.info.border",
    text: "info",
  },
} as const satisfies Record<
  TaxRatesStatusBannerKind,
  { fill: string; edge: string; text: "warning" | "info" }
>;

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      alignSelf: "stretch",
      borderWidth: 1,
      borderRadius: theme.radii.card,
      padding: theme.spacing["3"],
    },
    fallback: {
      backgroundColor: theme.colors[KIND_COLOURS.fallback.fill],
      borderColor: theme.colors[KIND_COLOURS.fallback.edge],
    },
    provisional: {
      backgroundColor: theme.colors[KIND_COLOURS.provisional.fill],
      borderColor: theme.colors[KIND_COLOURS.provisional.edge],
    },
  });
