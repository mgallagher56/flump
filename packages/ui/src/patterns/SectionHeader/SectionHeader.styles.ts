import { sva } from "../../../styled-system/css";

/**
 * E17 5A section header: tile, then the title over one line of description. The tile aligns to the
 * top so a description that wraps on a phone does not centre the tile against two lines.
 */
export const sectionHeader = sva({
  slots: ["root", "text", "titleRow", "description", "action"],
  base: {
    root: {
      display: "flex",
      alignItems: "flex-start",
      gap: "3",
      minWidth: "0",
      color: "text.primary",
    },
    text: {
      display: "flex",
      flexDirection: "column",
      gap: "0.5",
      flex: "1 1 auto",
      minWidth: "0",
    },
    titleRow: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: "2",
    },
    description: {
      margin: "0",
      color: "text.secondary",
      textStyle: "body.sm",
      maxWidth: "60ch",
    },
    action: {
      flexShrink: "0",
      alignSelf: "center",
    },
  },
});
