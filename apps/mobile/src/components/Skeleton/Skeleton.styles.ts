import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

/** How wide the last block is, so the placeholder reads as a paragraph and not a table. */
const LAST_LINE_WIDTH = "60%";

/**
 * Static blocks on the sunken surface. No shimmer, so Reduce Motion is met by construction. Each
 * block is one body line high at the current text size, so the placeholder grows with the text it
 * stands in for. A gallery preview draws its own scale in place of the phone's, as `Text` does.
 */
export const createStyles = (theme: Theme, fontScale: number) =>
  StyleSheet.create({
    base: { alignSelf: "stretch", gap: theme.spacing["2"] },
    line: {
      height:
        theme.textStyles["body.md"].lineHeight *
        (theme.textScale === 1 ? fontScale : theme.textScale),
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors["surface.sunken"],
    },
    last: { width: LAST_LINE_WIDTH },
  });
