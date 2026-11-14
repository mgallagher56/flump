import { css } from "@repo/ui/styled-system/css";

/** `PageBody` sets the width, gutters and gaps; the page keeps only its bottom space. */
export const pageRoot = css({ paddingBottom: "64px", minWidth: 0, width: "100%" });

/**
 * Empty page: the header and the empty state sit together (PageHeader brings its own bottom
 * margin), matching the mortgage page's empty view so both start at the same height.
 */
export const emptyStack = css({ display: "flex", flexDirection: "column", minWidth: 0 });

/** The empty state spans the page's full content width. */
export const emptyWrap = css({ width: "100%" });

/** A failed save: a real error, so the danger status colours apply (not a judgement). */
export const errorBanner = css({
  margin: 0,
  padding: "12px 16px",
  borderRadius: "md",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "status.danger.border",
  backgroundColor: "status.danger.bg",
  color: "status.danger.text",
  fontSize: "sm",
});

export const plainLink = css({
  color: "primary",
  textDecoration: "underline",
  fontWeight: "medium",
  textStyle: "body.sm",
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
});
