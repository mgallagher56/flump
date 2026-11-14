import { sva } from "../../../styled-system/css";

/**
 * E16 4.4 scenario zone: lighter than the saved "Your details" card, so the illustration never
 * outweighs saved facts. No fill: the zone shows the page canvas through a 1px dashed outline, which
 * reads as "not saved" through shape and words, never colour alone. A fill could not be quieter than
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
      borderColor: "border",
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
    },
    reset: {
      flexShrink: "0",
      gap: "1.5",
      _disabled: { cursor: "not-allowed" },
    },
  },
});
