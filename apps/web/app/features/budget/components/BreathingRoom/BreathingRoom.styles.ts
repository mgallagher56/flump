import { cva } from "@repo/ui/styled-system/css";

/** The result card keeps to a readable width; the section header spans the page. */
export const breathingRoomResult = cva({
  base: { width: "100%", maxWidth: "28rem" },
});

export const breathingRoomFigure = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});

export const breathingRoomNote = cva({
  base: {
    margin: 0,
    mt: "3",
    textStyle: "body.sm",
    color: "text.secondary",
  },
});

export const breathingRoomLink = cva({
  base: {
    color: "primary",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    fontWeight: "medium",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
      borderRadius: "sm",
    },
  },
});
