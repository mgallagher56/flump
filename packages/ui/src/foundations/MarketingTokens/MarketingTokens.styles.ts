import { css, cva } from "../../../styled-system/css";

export const marketingPage = cva({
  base: {
    p: { base: "16px", md: "24px" },
    backgroundColor: "surface.canvas",
    color: "text.primary",
    minHeight: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
});

export const sampleGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(2, minmax(0, 1fr))" },
    gap: "16px",
  },
});

/** The glass card: card fill under a faint diagonal sheen, a soft border and an inner top light. */
export const glassCard = cva({
  base: {
    backgroundColor: "material.glass.fill",
    backgroundImage: "linear-gradient(155deg, token(colors.material.glass.sheen), transparent 42%)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "material.glass.border",
    borderRadius: "card",
    boxShadow: "glass",
    p: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minWidth: "0",
  },
});

/** The paper document: paper fill with faint ruled lines, its edge drawn by shadows.paper. */
export const paperCard = cva({
  base: {
    backgroundColor: "material.paper.fill",
    backgroundImage:
      "repeating-linear-gradient(0deg, token(colors.material.paper.rule) 0 1px, transparent 1px 4px)",
    borderRadius: "md",
    boxShadow: "paper",
    p: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minWidth: "0",
  },
});

export const swatchRow = cva({
  base: { display: "flex", alignItems: "center", gap: "12px", textStyle: "body.sm" },
});

export const swatchChip = cva({
  base: {
    width: "40px",
    height: "24px",
    borderRadius: "sm",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    flexShrink: "0",
  },
});

export const scaleTable = css({ width: "100%", borderCollapse: "collapse", textStyle: "body.sm" });
export const scaleCell = css({ textAlign: "left", py: "4px", pr: "16px" });
export const scaleFigure = css({
  textAlign: "left",
  py: "4px",
  pr: "16px",
  textStyle: "numeric.sm",
});

// Literal token names keep Panda's static extraction working (no dynamic class building).
export const orbFills = {
  "orb.skyTeal.core": css({ backgroundColor: "orb.skyTeal.core" }),
  "orb.skyTeal.shade": css({ backgroundColor: "orb.skyTeal.shade" }),
  "orb.skyTeal.bubble": css({ backgroundColor: "orb.skyTeal.bubble" }),
  "orb.skyTeal.bubbleShade": css({ backgroundColor: "orb.skyTeal.bubbleShade" }),
  "orb.skyTeal.rim": css({ backgroundColor: "orb.skyTeal.rim" }),
  "orb.violetRose.core": css({ backgroundColor: "orb.violetRose.core" }),
  "orb.violetRose.shade": css({ backgroundColor: "orb.violetRose.shade" }),
  "orb.violetRose.bubble": css({ backgroundColor: "orb.violetRose.bubble" }),
  "orb.violetRose.bubbleShade": css({ backgroundColor: "orb.violetRose.bubbleShade" }),
  "orb.violetRose.rim": css({ backgroundColor: "orb.violetRose.rim" }),
} as const;

export const materialFills = {
  "material.glass.fill": css({ backgroundColor: "material.glass.fill" }),
  "material.glass.border": css({ backgroundColor: "material.glass.border" }),
  "material.glass.light": css({ backgroundColor: "material.glass.light" }),
  "material.glass.sheen": css({ backgroundColor: "material.glass.sheen" }),
  "material.paper.fill": css({ backgroundColor: "material.paper.fill" }),
  "material.paper.edge": css({ backgroundColor: "material.paper.edge" }),
  "material.paper.rule": css({ backgroundColor: "material.paper.rule" }),
} as const;
