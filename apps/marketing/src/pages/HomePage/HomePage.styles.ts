import { cva } from "@repo/ui/styled-system/css";

export const pageShell = cva({
  base: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "surface.canvas",
    // Bubbles and the orb never cause a sideways scroll; each sits fully inside its band (MK8).
    overflowX: "clip",
  },
});

export const mainContent = cva({
  base: { flex: "1", _focus: { outline: "none" } },
});

/**
 * More detail and the questions: stacked, then side by side on wide screens on one canvas band.
 * Owned by the bands (HomeMoreDetail, HomeFAQ); adjust here only for the pair's layout.
 */
export const pairBands = cva({
  base: {
    backgroundColor: "surface.canvas",
    lg: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      alignItems: "start",
    },
  },
});
