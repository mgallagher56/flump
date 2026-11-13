import { cva } from "@repo/ui/styled-system/css";

/** Layout shared by the three settings tabs. */
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

/**
 * Native `<select>` styled to match `@repo/ui` TextInput.
 * TODO(E15 T2.2b): swap for the @repo/ui Select primitive when it lands.
 */
export const nativeSelect = cva({
  base: {
    width: "100%",
    minWidth: 0,
    minHeight: "density.control.md",
    px: "density.controlPadX",
    py: "density.controlPadY",
    backgroundColor: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.input",
    borderRadius: "md",
    color: "text.primary",
    textStyle: "body.md",
    cursor: "pointer",
    "@media (pointer: coarse)": { minHeight: "touch" },
    _focusVisible: {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "border.focusRing",
      outlineOffset: "1px",
    },
  },
});
