import { cva } from "@repo/ui/styled-system/css";

/** The hero's product preview: a card frame around a real `KpiStrip`, as on the dashboard. */
export const previewFrame = cva({
  base: {
    width: "100%",
    maxWidth: "3xl",
    mx: "auto",
    textAlign: "left",
    backgroundColor: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    borderRadius: "xl",
    boxShadow: "card",
    p: { base: "4", md: "6" },
    display: "flex",
    flexDirection: "column",
    gap: "4",
  },
});

export const previewHeader = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "2",
  },
});

export const previewTitle = cva({
  base: { textStyle: "heading.sm", color: "text.primary", margin: 0 },
});

export const previewCaption = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0 },
});

/** The months-of-cover value, passed to `KpiCard` as text, keeps tabular figures like `Money`. */
export const previewFigure = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});

/**
 * One emphasised figure across the top, two supporting figures in a row below (stacked on a
 * phone). The hero tile is only as tall as its content, so it has no empty area (round 4).
 */
export const previewBody = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
    gap: "4",
    alignItems: "stretch",
  },
});

/** On a phone the two supporting cards stack; from md they share the row below the hero. */
export const previewSupporting = cva({
  base: { display: { base: "flex", md: "contents" }, flexDirection: "column", gap: "4" },
});

/** The preview keeps the hero tile flat: no decorative shape behind the figure (round 3). */
export const previewHero = cva({
  base: { gridColumn: { md: "1 / -1" }, "& [data-decorative]": { display: "none" } },
});
