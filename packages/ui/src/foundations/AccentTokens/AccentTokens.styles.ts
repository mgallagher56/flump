import { css, cva } from "../../../styled-system/css";

export const accentPage = cva({
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

export const accentGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(2, minmax(0, 1fr))" },
    gap: "16px",
  },
});

export const accentCard = cva({
  base: {
    backgroundColor: "accent.subtle",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "accent.border",
    borderRadius: "card",
    p: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minWidth: "0",
  },
});

export const plainCard = cva({
  base: {
    backgroundColor: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    borderRadius: "card",
    p: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minWidth: "0",
  },
});

export const accentTile = cva({
  base: {
    width: "32px",
    height: "32px",
    borderRadius: "md",
    backgroundColor: "surface.card",
    color: "accent",
    display: "grid",
    placeItems: "center",
    flexShrink: "0",
  },
});

export const heroSample = cva({
  base: {
    backgroundColor: "surface.hero",
    color: "text.onContrast",
    borderRadius: "card",
    p: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
  },
});

export const heroSun = cva({
  base: {
    width: "36px",
    height: "36px",
    borderRadius: "full",
    backgroundColor: "accent.onHero",
    flexShrink: "0",
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

// Literal token names keep Panda's static extraction working (no dynamic class building).
export const accentFills = {
  accent: css({ backgroundColor: "accent" }),
  "accent.subtle": css({ backgroundColor: "accent.subtle" }),
  "accent.border": css({ backgroundColor: "accent.border" }),
  "accent.onHero": css({ backgroundColor: "accent.onHero" }),
  "chart.accent": css({ backgroundColor: "chart.accent" }),
} as const;

export const accentLine = css({ stroke: "chart.accent" });
export const primaryLine = css({ stroke: "chart.primary" });
