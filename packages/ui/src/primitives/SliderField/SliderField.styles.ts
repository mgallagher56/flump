import { cva } from "../../../styled-system/css";

export const sliderFieldContainer = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2",
    width: "100%",
  },
});

export const sliderFieldHeader = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "3",
  },
});

/** The label and its addon (an info button) side by side. */
export const sliderFieldLabelRow = cva({
  base: { display: "inline-flex", alignItems: "center", gap: "1", minWidth: 0 },
});

export const sliderFieldLabel = cva({
  base: {
    textStyle: "label.md",
    color: "text.primary",
  },
});

export const sliderFieldValuePill = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5",
    px: "3",
    py: "1",
    minHeight: "32px",
    borderRadius: "full",
    backgroundColor: "surface.sunken",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.input",
    textStyle: "label.md",
    fontWeight: "semibold",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
    "@media (pointer: coarse)": { minHeight: "touch" },
    _focusWithin: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
  variants: {
    disabled: {
      // No opacity: the affix text must keep its contrast. Dim the fill instead.
      true: { backgroundColor: "surface.subtle", cursor: "not-allowed" },
      false: {},
    },
  },
  defaultVariants: { disabled: false },
});

export const sliderPillInput = cva({
  base: {
    width: "88px",
    textAlign: "right",
    border: "none",
    backgroundColor: "transparent",
    color: "text.primary",
    fontWeight: "semibold",
    // 16px on every width: iOS Safari zooms the page when a focused input is under 16px (RC-3,
    // P08). The pill keeps label.md for its affix text, and lineHeight stays tight so the pill
    // does not grow.
    fontSize: "md",
    lineHeight: "1.25",
    fontVariantNumeric: "tabular-nums",
    p: "0",
    // The focus indicator lives on the pill container via _focusWithin.
    outline: "none",
    _disabled: { color: "text.secondary", cursor: "not-allowed" },
    _placeholder: { color: "text.muted", fontWeight: "normal" },
  },
});

/**
 * `pre` keeps an affix's own spaces: the pill is a flex row, and a flex item's leading space is
 * otherwise dropped, so `unitSuffix=" years"` read "5years" (R2-8).
 */
export const sliderPillAffix = cva({
  base: { color: "text.secondary", fontVariantNumeric: "tabular-nums", whiteSpace: "pre" },
});

export const sliderHelperText = cva({
  base: { textStyle: "body.sm", color: "text.muted" },
});

const thumb = {
  appearance: "none",
  width: "22px",
  height: "22px",
  borderRadius: "full",
  backgroundColor: "surface.card",
  borderWidth: "2px",
  borderStyle: "solid",
  borderColor: "primary",
  boxShadow: "card",
  cursor: "pointer",
  "@media (pointer: coarse)": { width: "28px", height: "28px" },
} as const;

const track = {
  height: "8px",
  borderRadius: "full",
  // --slider-fill is set from the component (0% to 100%) so the filled part reads as progress.
  background:
    "linear-gradient(to right, token(colors.primary) var(--slider-fill, 0%), token(colors.border) var(--slider-fill, 0%))",
} as const;

export const sliderInputTrack = cva({
  base: {
    appearance: "none",
    width: "100%",
    margin: "0",
    height: "24px",
    backgroundColor: "transparent",
    cursor: "pointer",
    "@media (pointer: coarse)": { height: "touch" },
    "&::-webkit-slider-runnable-track": track,
    "&::-moz-range-track": track,
    "&::-webkit-slider-thumb": { ...thumb, marginTop: "-7px" },
    "&::-moz-range-thumb": thumb,
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
      borderRadius: "full",
    },
    _disabled: { cursor: "not-allowed", opacity: 0.6 },
  },
});
