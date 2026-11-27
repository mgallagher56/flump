import { css } from "@repo/ui/styled-system/css";

/*
 * The other pages' first band (the approved features and area prototypes, `OHero` and
 * `others.css`): copy on the left and the orbs on the right; on phones the orbs sit on a shelf under
 * the calls to action. Positioned and isolated, so the orb stage sits behind the copy. The copy
 * itself never moves: it is the page's largest text and is there at first paint.
 */
export const hero = css({
  position: "relative",
  isolation: "isolate",
  backgroundColor: "surface.canvas",
  py: "clamp(2.5rem, 6vw, 5rem)",
  px: "4",
  // The shelf the orbs sit on, below the calls to action.
  "@media (max-width: 47.99rem)": { pb: "9rem" },
  "@media (min-width: 48rem)": { display: "flex", alignItems: "center", minHeight: "26rem" },
  "@media (min-width: 64rem)": { minHeight: "30rem" },
});

export const heroInner = css({
  position: "relative",
  width: "full",
  maxWidth: "72rem",
  mx: "auto",
});

export const heroCopy = css({
  display: "grid",
  gap: "4",
  justifyItems: "start",
  "@media (min-width: 48rem)": { maxWidth: "min(38rem, 62%)" },
  "@media (min-width: 64rem)": { maxWidth: "min(38rem, 54%)" },
});

export const heroLabel = css({ margin: 0, fontWeight: "semibold", color: "text.secondary" });

export const heroTitle = css({
  textStyle: "display",
  color: "text.primary",
  margin: 0,
  textWrap: "balance",
});

export const heroLead = css({
  textStyle: "body.lg",
  color: "text.secondary",
  margin: 0,
  maxWidth: "34ch",
});

/** One more line under the lead (the features page's hint). */
export const heroNote = css({ margin: 0, maxWidth: "44ch", color: "text.secondary" });

export const heroCtas = css({ mt: "1", "& > div": { justifyContent: "flex-start" } });

/** The pause control as the prototype's: a pill with a hairline border on the card colour. */
export const heroPause = css({
  borderRadius: "full",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border",
  backgroundColor: "color-mix(in oklab, token(colors.surface.card) 94%, transparent)",
  // Nothing to stop before hydration or with reduced motion: no pill either.
  "&:has([data-motion-control][aria-hidden]), &:has(button:disabled)": { visibility: "hidden" },
});
