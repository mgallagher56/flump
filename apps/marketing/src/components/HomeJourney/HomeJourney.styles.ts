import { css } from "@repo/ui/styled-system/css";

/** The journey's intro row: the pause control for the orb sits under the lead (MK14). */
export const introControl = css({
  display: "flex",
  justifyContent: "flex-start",
  marginTop: "-4",
});

/**
 * The journey: the orb's rail in a narrow column beside the stops, so the orb and its bead track
 * never cross a card, a heading or text (MK8). The rail is slim on a phone and wider where the
 * screen allows; nothing else changes with the width.
 */
export const journey = css({
  position: "relative",
  display: "grid",
  gridTemplateColumns: {
    base: "40px minmax(0, 1fr)",
    md: "72px minmax(0, 1fr)",
    lg: "160px minmax(0, 1fr)",
    xl: "200px minmax(0, 1fr)",
  },
  columnGap: { base: "3", md: "6", lg: "8" },
});

/** The six stops, a plain vertical list in reading order, with no empty screen between them. */
export const stopList = css({
  display: "grid",
  gap: { base: "12", md: "16", lg: "20" },
  listStyle: "none",
  margin: "0",
  padding: "0",
  minWidth: "0",
});
