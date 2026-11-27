import { css, cva } from "@repo/ui/styled-system/css";

/*
 * One journey stop: the text panel and its sample side by side from `lg` (stacked below), the
 * sample swapping sides at every stop. A plain list item in normal flow: no pinning and no sticky
 * rest, so the journey never leaves an empty screen (MK8).
 */

export const stopItem = css({
  listStyle: "none",
  margin: "0",
  padding: "0",
  minWidth: "0",
});

export const pair = cva({
  base: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: { base: "4", md: "6" },
    alignItems: "center",
  },
  variants: {
    sampleSide: {
      right: { lg: { gridTemplateColumns: "minmax(0, 5fr) minmax(0, 7fr)", gap: "10" } },
      left: {
        lg: {
          gridTemplateColumns: "minmax(0, 7fr) minmax(0, 5fr)",
          gap: "10",
          "& > [data-stop-side=sample]": { order: -1 },
        },
      },
    },
  },
});

export const side = css({
  minWidth: "0",
});

/** The text panel: a glass card, so the stop reads as one piece beside its paper sample. */
export const panel = css({
  display: "grid",
  gap: "3",
  justifyItems: "start",
});

/** The stop's plain name with a small mint dot: wayfinding, not a count (no "1 of 6"). */
export const name = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "2",
  margin: "0",
  textStyle: "label.md",
  color: "text.secondary",
});

export const marker = css({
  width: "8px",
  height: "8px",
  flex: "none",
  borderRadius: "full",
  backgroundColor: "primary.solid",
  boxShadow: "0 0 0 4px {colors.primary.subtle}",
});

export const title = css({
  textStyle: "heading.lg",
  color: "text.primary",
  margin: "0",
  textWrap: "balance",
});

export const lead = css({
  textStyle: "body.lg",
  color: "text.primary",
  margin: "0",
});

export const fact = css({
  textStyle: "body.md",
  color: "text.secondary",
  margin: "0",
});

export const link = css({
  textStyle: "label.md",
  color: "primary",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  borderRadius: "sm",
  _hover: { color: "primary.hover" },
  _focusVisible: { outline: "none", boxShadow: "focus" },
});
