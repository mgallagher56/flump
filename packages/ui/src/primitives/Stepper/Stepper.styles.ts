import { cva } from "../../../styled-system/css";

export const stepperRoot = cva({
  base: { width: "100%" },
});

/** Phone summary: "Step 2 of 5" plus the current step name and a segmented track. */
export const stepperCompact = cva({
  base: {
    display: { base: "flex", md: "none" },
    flexDirection: "column",
    gap: "8px",
  },
});

export const stepperCompactCount = cva({
  base: {
    color: "text.secondary",
    fontSize: "sm",
    fontWeight: "semibold",
    fontVariantNumeric: "tabular-nums",
    margin: 0,
  },
});

export const stepperCompactName = cva({
  base: { color: "text.primary", fontSize: "md", fontWeight: "bold", margin: 0 },
});

export const stepperSegments = cva({
  base: { display: "flex", gap: "4px", listStyle: "none", margin: 0, padding: 0 },
});

export const stepperSegment = cva({
  base: { flex: "1 1 0", height: "4px", borderRadius: "full" },
  variants: {
    state: {
      complete: { backgroundColor: "primary" },
      current: { backgroundColor: "primary" },
      upcoming: { backgroundColor: "border.strong" },
    },
  },
});

export const stepperList = cva({
  base: {
    display: { base: "none", md: "flex" },
    alignItems: "flex-start",
    listStyle: "none",
    margin: 0,
    padding: 0,
    gap: "0",
  },
});

/**
 * Each step is an equal column: marker on top, name centred underneath. Columns give the names
 * room to sit on one or two lines at desktop widths instead of being squeezed beside the marker.
 */
export const stepperItem = cva({
  base: {
    position: "relative",
    display: "flex",
    justifyContent: "center",
    flex: "1 1 0",
    minWidth: 0,
    // The connector runs from this step's marker to the next one's (marker 36px, 8px clear).
    "&:not(:last-child)::after": {
      content: '""',
      position: "absolute",
      top: "17px",
      left: "calc(50% + 26px)",
      width: "calc(100% - 52px)",
      height: "3px",
      borderRadius: "full",
      backgroundColor: "border",
    },
    "&[data-state=complete]:not(:last-child)::after": { backgroundColor: "primary" },
  },
});

/** Marker and text together; a button when the step can be jumped to. */
export const stepperTarget = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    maxWidth: "100%",
    paddingInline: "4px",
    paddingBlockEnd: "4px",
    borderRadius: "md",
    textAlign: "center",
  },
  variants: {
    interactive: {
      true: {
        appearance: "none",
        backgroundColor: "transparent",
        borderWidth: "0",
        color: "inherit",
        font: "inherit",
        cursor: "pointer",
        paddingBlockStart: "0",
        "&:hover [data-step-label]": { textDecoration: "underline" },
        _focusVisible: {
          outlineWidth: "2px",
          outlineStyle: "solid",
          outlineColor: "border.focusRing",
          outlineOffset: "2px",
        },
      },
    },
  },
});

export const stepperMarker = cva({
  base: {
    flex: "none",
    width: "36px",
    height: "36px",
    borderRadius: "full",
    display: "grid",
    placeItems: "center",
    borderWidth: "2px",
    borderStyle: "solid",
    fontWeight: "bold",
    fontSize: "sm",
    fontVariantNumeric: "tabular-nums",
  },
  variants: {
    state: {
      complete: {
        backgroundColor: "primary.subtle",
        // Full-strength teal edge and tick: 3:1 or better against the card in light and dark
        // (the tick on primary.subtle measures 5.4:1 light and 6.6:1 dark).
        borderColor: "primary",
        color: "primary",
      },
      current: {
        backgroundColor: "primary.solid",
        borderColor: "primary.solid",
        color: "primary.foreground",
        boxShadow: "0 0 0 4px token(colors.primary.subtle)",
      },
      upcoming: {
        backgroundColor: "surface.card",
        borderColor: "border.strong",
        color: "text.secondary",
      },
    },
  },
});

export const stepperText = cva({
  base: { display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", minWidth: 0 },
});

export const stepperLabel = cva({
  // Balanced wrapping: a long name splits into two even lines, never one word left on its own.
  base: { fontSize: "sm", fontWeight: "semibold", lineHeight: "1.3", textWrap: "balance" },
  variants: {
    state: {
      complete: { color: "text.primary" },
      current: { color: "text.primary" },
      upcoming: { color: "text.secondary" },
    },
  },
});

export const stepperStatus = cva({
  base: { color: "text.muted", fontSize: "xs", fontWeight: "medium", whiteSpace: "nowrap" },
});
