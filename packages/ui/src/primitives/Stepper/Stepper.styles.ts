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

export const stepperItem = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    flex: "0 1 auto",
    minWidth: 0,
    "&:not(:last-child)": { flex: "1 1 auto" },
    // The connector after a step fills once that step is complete.
    "&:not(:last-child)::after": {
      content: '""',
      flex: "1 1 24px",
      minWidth: "24px",
      marginBlockStart: "17px",
      marginInlineEnd: "10px",
      height: "3px",
      borderRadius: "full",
      backgroundColor: "border",
    },
    "&[data-state=complete]:not(:last-child)::after": { backgroundColor: "primary" },
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
        borderColor: "primary.border",
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
  base: { display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 },
});

export const stepperLabel = cva({
  base: { fontSize: "md", fontWeight: "semibold", lineHeight: "1.3" },
  variants: {
    state: {
      complete: { color: "text.primary" },
      current: { color: "text.primary" },
      upcoming: { color: "text.secondary" },
    },
  },
});

export const stepperStatus = cva({
  base: { color: "text.muted", fontSize: "xs", fontWeight: "medium" },
});
