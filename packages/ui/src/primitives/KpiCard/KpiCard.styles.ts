import { cva } from "../../../styled-system/css";

export const kpiCardContainer = cva({
  base: {
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    p: "density.cardPad",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "density.gap",
    height: "100%",
    minWidth: 0,
    boxShadow: "card",
  },
});

export const kpiEyebrow = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "2",
  },
});

export const kpiLabel = cva({
  base: {
    textStyle: "label.sm",
    color: "text.muted",
    minWidth: 0,
    overflowWrap: "anywhere",
  },
});

export const kpiValueRow = cva({
  base: {
    display: "flex",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: "2",
  },
});

export const kpiHeroValue = cva({
  base: {
    textStyle: "numeric.kpi",
    fontVariantNumeric: "tabular-nums",
    color: "text.primary",
    margin: "0",
    minWidth: 0,
    overflowWrap: "anywhere",
  },
});

export const kpiSubtext = cva({
  base: {
    textStyle: "body.sm",
    color: "text.muted",
    margin: "0",
    pt: "1",
  },
});

export const kpiLoadingBar = cva({
  base: {
    height: "2rem",
    width: "60%",
    borderRadius: "md",
    backgroundColor: "surface.sunken",
    _motionSafe: {
      bgGradient: "to-r",
      gradientFrom: "surface.sunken",
      gradientVia: "surface.subtle",
      gradientTo: "surface.sunken",
      backgroundSize: "200% 100%",
      animationName: "shimmer",
      animationDuration: "slow",
      animationTimingFunction: "standard",
      animationIterationCount: "infinite",
    },
  },
});

export const kpiDeltaContent = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "1",
    fontVariantNumeric: "tabular-nums",
  },
});
