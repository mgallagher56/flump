import { css, cva } from "@repo/ui/styled-system/css";

/*
 * The approved preview prototype (`others2.css`, `o2-moment`): each moment's intro (with the
 * check-in's picture beside it on wide screens), its frame and its link.
 */

export const mainContent = css({ flex: "1", _focus: { outline: "none" } });

export const moment = css({ display: "grid", gap: "5" });

export const momentHead = cva({
  base: { display: "grid", gap: "5", alignItems: "start" },
  variants: {
    picture: {
      true: { "@media (min-width: 64rem)": { gridTemplateColumns: "minmax(0, 1fr) 18rem" } },
      false: {},
    },
  },
  defaultVariants: { picture: false },
});

export const momentIntro = css({
  display: "grid",
  gap: "2",
  maxWidth: "46rem",
  "& p": { margin: 0, color: "text.secondary" },
});

/** Wide screens only: on a phone the picture would push the figures below it down (B10). */
export const momentPicture = css({
  display: "none",
  "@media (min-width: 64rem)": { display: "block" },
});

/** The frame keeps its own width: a still box, nothing moves inside it. */
export const momentFrame = css({ minWidth: 0 });

export const momentLinkRow = css({ margin: 0 });

export const momentLink = css({
  color: "primary",
  fontWeight: "semibold",
  textUnderlineOffset: "3px",
  _hover: { color: "primary.emphasis" },
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
});
