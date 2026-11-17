import { sva } from "../../../styled-system/css";

/**
 * E16 4.4 scenario zone: lighter than the saved "Your details" card, so the illustration never
 * outweighs saved facts. No fill: the zone shows the page canvas through a 1px dashed outline, which
 * reads as "not saved" through shape and words, never colour alone. E17 5A: the outline is
 * `border.input` (3:1 or more on the canvas in both themes, where `border` was 1.3:1 and got lost),
 * and the outcome sits in the zone's one `ResultBlock`, beside the inputs from `md` up. A fill could not be quieter than
 * a card in both themes: `surface.subtle` sits below the card in light (#f0ebe2 under #fffdf9) but
 * above it in dark (#2e2a26 over #272320), so in dark the zone outweighed "Your details", and
 * `surface.sunken` reads as a hole in dark. The canvas is the quietest surface in both. Never
 * `surface.hero`.
 */
export const scenarioZone = sva({
  slots: [
    "root",
    "header",
    "titleRow",
    "titleGroup",
    "basis",
    "body",
    "split",
    "result",
    "footer",
    "footerActions",
    "reset",
  ],
  base: {
    root: {
      display: "flex",
      flexDirection: "column",
      gap: "4",
      backgroundColor: "transparent",
      borderWidth: "1px",
      borderStyle: "dashed",
      borderColor: "border.input",
      borderRadius: "2xl",
      color: "text.primary",
      minWidth: "0",
      p: { base: "4", md: "6" },
    },
    header: {
      display: "flex",
      flexDirection: "column",
      gap: "1",
    },
    /** One header row: title left, "Illustration, not saved" badge right (wraps under at 375). */
    titleRow: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "2",
    },
    /** Kept for consumers that styled the old title group; the title row now holds both. */
    titleGroup: {
      minWidth: "0",
    },
    basis: {
      margin: "0",
      color: "text.secondary",
      textStyle: "body.sm",
      fontVariantNumeric: "tabular-nums",
    },
    /** Children sit on the zone surface: no nested card chrome or headings. */
    body: {
      display: "flex",
      flexDirection: "column",
      gap: "4",
      minWidth: "0",
    },
    /** Inputs then the result: stacked on a phone, 5 to 7 side by side from tablet width. */
    split: {
      display: "grid",
      gridTemplateColumns: { base: "minmax(0, 1fr)", md: "minmax(0, 5fr) minmax(0, 7fr)" },
      gap: { base: "4", md: "6" },
      alignItems: "start",
      minWidth: "0",
    },
    result: { minWidth: "0" },
    /** Reset, "Update your details" and the page's single notice. */
    footer: {
      display: "flex",
      flexDirection: "column",
      gap: "3",
    },
    footerActions: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: "3",
      textStyle: "body.sm",
      color: "text.secondary",
      // A ghost button that leads the footer (Reset hidden) keeps its text at the zone's leading
      // edge: its own side padding (Button sm, px 4) would otherwise indent it.
      "& > [data-variant='ghost']:first-child": { marginInlineStart: "-4" },
    },
    reset: {
      flexShrink: "0",
      gap: "1.5",
      _disabled: { cursor: "not-allowed" },
    },
  },
});
