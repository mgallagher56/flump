import { cva } from "@repo/ui/styled-system/css";

/**
 * Below the hero, each band skips style and layout until it nears the viewport
 * (`content-visibility: auto`), so the first paint lays out the hero alone: the whole page's first
 * layout was the longest main-thread task on a throttled phone (ROLLOUT-PLAN M1 notes). Each band
 * reserves its own height at each width, measured on the production build with reduced motion at
 * 390, 768, 1000, 1100, 1280 and 1440px (27 Nov 2026, prototype 11 rebuild), in non-overlapping
 * ranges cut at the bands' own layout changes (48, 60, 64, 75 and 90rem), and `auto` keeps the real
 * size once seen, so nothing shifts. The reserve is the band's content box: its padding adds to it,
 * so each value is the band's height less its own vertical padding (a border-box value made every
 * padded band arrive 96 to 128px shorter than reserved, and the page shrank as it was read). The journey reserves its still height (the plain list: reduced motion,
 * no JavaScript, paused); live, it pins each stop for a screen and a half and runs about 8,500px,
 * so its real size replaces the reserve as it nears the screen, below the viewport. The order
 * follows `HomePage.tsx`: features, journey, rough figures, pay rise, security, the pair, the close. `useGsapMoment` refreshes ScrollTrigger when
 * a band's real size arrives.
 */
export const mainContent = cva({
  base: {
    flex: "1",
    _focus: { outline: "none" },
    "& > :not(:first-child)": { contentVisibility: "auto" },
    // Printing lays the whole page out at once: paint every band.
    "@media print": { "& > :not(:first-child)": { contentVisibility: "visible" } },
    "& > :nth-child(2)": {
      "@media (max-width: 47.99rem)": { containIntrinsicSize: "auto 644px" },
      "@media (min-width: 48rem) and (max-width: 63.99rem)": { containIntrinsicSize: "auto 622px" },
      "@media (min-width: 64rem) and (max-width: 89.99rem)": { containIntrinsicSize: "auto 905px" },
      "@media (min-width: 90rem)": { containIntrinsicSize: "auto 965px" },
    },
    "& > :nth-child(3)": {
      "@media (max-width: 47.99rem)": { containIntrinsicSize: "auto 4744px" },
      "@media (min-width: 48rem) and (max-width: 59.99rem)": {
        containIntrinsicSize: "auto 4596px",
      },
      "@media (min-width: 60rem) and (max-width: 89.99rem)": {
        containIntrinsicSize: "auto 3345px",
      },
      "@media (min-width: 90rem)": { containIntrinsicSize: "auto 3486px" },
    },
    "& > :nth-child(4)": {
      "@media (max-width: 47.99rem)": { containIntrinsicSize: "auto 747px" },
      "@media (min-width: 48rem) and (max-width: 59.99rem)": { containIntrinsicSize: "auto 686px" },
      "@media (min-width: 60rem) and (max-width: 74.99rem)": { containIntrinsicSize: "auto 425px" },
      "@media (min-width: 75rem)": { containIntrinsicSize: "auto 432px" },
    },
    "& > :nth-child(5)": {
      "@media (max-width: 47.99rem)": { containIntrinsicSize: "auto 899px" },
      "@media (min-width: 48rem)": { containIntrinsicSize: "auto 572px" },
    },
    "& > :nth-child(6)": {
      "@media (max-width: 47.99rem)": { containIntrinsicSize: "auto 462px" },
      "@media (min-width: 48rem) and (max-width: 89.99rem)": { containIntrinsicSize: "auto 260px" },
      "@media (min-width: 90rem)": { containIntrinsicSize: "auto 284px" },
    },
    "& > :nth-child(7)": {
      "@media (max-width: 47.99rem)": { containIntrinsicSize: "auto 1412px" },
      "@media (min-width: 48rem) and (max-width: 59.99rem)": {
        containIntrinsicSize: "auto 1191px",
      },
      "@media (min-width: 60rem) and (max-width: 63.99rem)": {
        containIntrinsicSize: "auto 1134px",
      },
      "@media (min-width: 64rem) and (max-width: 74.99rem)": {
        containIntrinsicSize: "auto 1114px",
      },
      "@media (min-width: 75rem) and (max-width: 89.99rem)": { containIntrinsicSize: "auto 764px" },
      "@media (min-width: 90rem)": { containIntrinsicSize: "auto 821px" },
    },
    "& > :nth-child(8)": {
      "@media (max-width: 47.99rem)": { containIntrinsicSize: "auto 474px" },
      "@media (min-width: 48rem) and (max-width: 59.99rem)": { containIntrinsicSize: "auto 527px" },
      "@media (min-width: 60rem) and (max-width: 63.99rem)": { containIntrinsicSize: "auto 539px" },
      "@media (min-width: 64rem) and (max-width: 89.99rem)": { containIntrinsicSize: "auto 559px" },
      "@media (min-width: 90rem)": { containIntrinsicSize: "auto 576px" },
    },
  },
});

/**
 * More detail and the questions (prototype 11): stacked, each on its own tone, then from 75rem
 * side by side on one card band. The pair sits in one centred column, wider than a single band and
 * never edge to edge, with a clear gutter between the two lists; the outer gutters belong to the
 * bands, so each band's bubbles reach the page's edge. From 90rem the headings step up with the
 * page. Each half keeps its own heading and stop.
 */
export const pairBands = cva({
  base: {
    "@media (min-width: 75rem)": {
      "--pair-max": "clamp(72rem, 64rem + 14vw, 100rem)",
      "--pair-gutter": "max(token(spacing.6), calc((100vw - var(--pair-max)) / 2))",
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
      columnGap: "clamp(40px, 4vw, 96px)",
      backgroundColor: "surface.card",
      "& > section": { backgroundColor: "transparent", px: "0" },
      "& > section:first-child": { pl: "var(--pair-gutter)" },
      "& > section:last-child": { pr: "var(--pair-gutter)" },
      "& > section > div": { maxWidth: "none", px: "0" },
    },
    "@media (min-width: 90rem)": { "& > section h2": { fontSize: "4xl" } },
  },
});
