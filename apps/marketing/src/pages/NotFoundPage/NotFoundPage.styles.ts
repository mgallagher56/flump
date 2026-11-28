import { css } from "@repo/ui/styled-system/css";

/*
 * The approved not-found prototype (`others2.css`, `o2-nf`): one centred glass card in a narrow
 * band, and one orb clear of it.
 */

export const mainContent = css({ flex: "1", _focus: { outline: "none" } });

/** The band's orb layer, behind the card (the band is positioned and isolated). */
export const orbStage = css({
  position: "absolute",
  inset: "0",
  zIndex: "-1",
  pointerEvents: "none",
  containerType: "size",
});

/**
 * One orb, clear of the card (the prototype's `ONE_ORB`): just right of the 48rem column where
 * there is room (from 1108px: half the screen plus 408px plus the orb must end 16px from the edge),
 * at most 130px or 30% of the band's height, a third of the way down; otherwise 36px at the
 * band's top right corner.
 */
export const oneOrb = css({
  position: "absolute",
  translate: "-50% -50%",
  left: "calc(100% - 34px)",
  top: "30px",
  "--orb-size": "36px",
  "@media (min-width: 1108px)": {
    "--orb-size": "min(130px, 30cqh)",
    left: "calc(50% + 408px + var(--orb-size) / 2)",
    top: "32%",
  },
});

export const notFoundCard = css({
  position: "relative",
  display: "grid",
  justifyItems: "center",
  gap: "4",
  textAlign: "center",
  p: "clamp(24px, 3vw, 48px)",
  // Longhands: they come after the card's own corner in the stylesheet, so they win.
  borderTopLeftRadius: "28px",
  borderTopRightRadius: "28px",
  borderBottomLeftRadius: "28px",
  borderBottomRightRadius: "28px",
});

export const notFoundPicture = css({ width: "min(100%, 18rem)" });

/** The close card's title (`o1-close__title`), on the type scale: 24px, then 30px. */
export const notFoundHeading = css({
  margin: 0,
  fontWeight: "bold",
  fontSize: { base: "2xl", md: "3xl" },
  lineHeight: "1.2",
  color: "text.primary",
  textWrap: "balance",
});

export const notFoundBody = css({ margin: 0, color: "text.secondary" });
