import { cva } from "../../../styled-system/css";

export const pageHeaderContainer = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "4",
    width: "100%",
    mb: { base: "5", md: "6" },
  },
});

export const pageHeaderText = cva({
  // A 192px basis lets one action sit beside the h1 at 375 instead of on a row of its own; more
  // actions than fit still wrap below (E16 round 4).
  base: { flex: "1 1 192px", minWidth: 0 },
});

export const pageHeaderTitle = cva({
  base: {
    textStyle: "heading.xl",
    color: "text.primary",
    margin: "0",
  },
});

export const pageHeaderDescription = cva({
  base: {
    textStyle: "body.md",
    color: "text.secondary",
    margin: "0",
    mt: "1",
    maxWidth: "720px",
  },
});

export const pageHeaderAside = cva({
  base: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: "3",
  },
});

/** Quiet outlined pill, for example "Sample data". */
export const pageHeaderBadge = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    textStyle: "label.sm",
    color: "text.secondary",
    backgroundColor: "surface.sunken",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    borderRadius: "full",
    px: "3",
    py: "0.5",
    whiteSpace: "nowrap",
  },
});
