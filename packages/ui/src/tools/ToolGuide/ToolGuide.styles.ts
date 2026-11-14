import { cva } from "../../../styled-system/css";

/** The guide and FAQ panels, stacked under the calculator. */
export const guideRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", width: "100%" },
});

/** A native `<details>` card, styled to match the `CollapsibleDrawer` card variant. */
export const guideDetails = cva({
  base: {
    borderRadius: "2xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    backgroundColor: "surface.card",
    overflow: "hidden",
  },
});

export const guideSummary = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "4",
    p: { base: "14px 16px", md: "16px 20px" },
    minHeight: "touch",
    cursor: "pointer",
    listStyle: "none",
    color: "text.primary",
    "&::-webkit-details-marker": { display: "none" },
    "&::marker": { content: '""' },
    _motionSafe: { transition: "background-color token(durations.fast) token(easings.standard)" },
    _hover: { backgroundColor: "surface.subtle" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "-2px",
    },
  },
});

export const guideTitleRow = cva({
  base: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "2" },
});

export const guideTitle = cva({
  base: { textStyle: "label.md", fontWeight: "semibold", color: "text.primary", margin: "0" },
});

export const guideCount = cva({
  base: { textStyle: "body.sm", color: "text.secondary", fontVariantNumeric: "tabular-nums" },
});

export const guideAction = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "1",
    flexShrink: 0,
    textStyle: "label.sm",
    fontWeight: "semibold",
    color: "primary",
  },
});

/** "Show" while closed, "Hide" while open: swapped by the parent `<details>` state, no script. */
export const guideCue = cva({
  base: {},
  variants: {
    when: {
      closed: { "details[open] &": { display: "none" } },
      open: { display: "none", "details[open] &": { display: "inline" } },
    },
  },
});

export const guideChevron = cva({
  base: {
    display: "inline-flex",
    _motionSafe: { transition: "transform token(durations.base) token(easings.standard)" },
    "details[open] &": { transform: "rotate(180deg)" },
  },
});

export const guideBody = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "6",
    p: { base: "16px", md: "20px" },
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
  },
});

export const guideBlock = cva({
  base: { display: "flex", flexDirection: "column", gap: "2" },
});
