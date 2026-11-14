import { cva } from "@repo/ui/styled-system/css";

/**
 * Layout shared by the three settings tabs. Every section is a `Card` with a `sectionHeading` h2,
 * a `sectionLead` line and at most one action row; a destructive action sits in a danger row with
 * the `danger` button and a type-to-confirm dialog.
 */
export const tabStack = cva({
  base: { display: "flex", flexDirection: "column", gap: "6", minWidth: 0 },
});

export const sectionCard = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: 0 },
});

export const sectionHeading = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const sectionLead = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

export const fieldGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
    gap: "4",
  },
});

export const statusText = cva({
  base: { textStyle: "body.sm", margin: 0, fontVariantNumeric: "tabular-nums" },
  variants: {
    tone: {
      positive: { color: "status.positive.text" },
      danger: { color: "status.danger.text" },
      muted: { color: "text.muted" },
    },
  },
  defaultVariants: { tone: "muted" },
});

/** Save bar at the foot of a tab that has its own save. */
export const saveBar = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: "3",
  },
});
