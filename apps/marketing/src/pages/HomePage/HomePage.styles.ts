import { cva } from "@repo/ui/styled-system/css";

export const pageShell = cva({
  base: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "surface.canvas",
    // Bubbles and the orb never cause a sideways scroll; each sits fully inside its band (MK8).
    overflowX: "clip",
  },
});

/**
 * Below the hero, each band skips style and layout until it nears the viewport
 * (`content-visibility: auto`), so the first paint lays out the hero alone: the whole page's first
 * layout was the longest main-thread task on a throttled phone (ROLLOUT-PLAN M1 notes). Each band
 * reserves about its own height at each width (measured 27 Nov 2026), and `auto` keeps the real
 * size once seen, so nothing shifts. The order follows `HomePage.tsx`: features, journey, rough
 * figures, pay rise, security, the pair, the close. `useGsapMoment` refreshes ScrollTrigger when
 * a band's real size arrives.
 */
export const mainContent = cva({
  base: {
    flex: "1",
    _focus: { outline: "none" },
    "& > :not(:first-child)": { contentVisibility: "auto" },
    // Printing lays the whole page out at once: paint every band.
    "@media print": { "& > :not(:first-child)": { contentVisibility: "visible" } },
    "& > :nth-child(2)": { containIntrinsicSize: { base: "auto 730px", lg: "auto 1090px" } },
    "& > :nth-child(3)": {
      containIntrinsicSize: { base: "auto 4920px", md: "auto 4480px", xl: "auto 3060px" },
    },
    "& > :nth-child(4)": { containIntrinsicSize: { base: "auto 560px", md: "auto 500px" } },
    "& > :nth-child(5)": { containIntrinsicSize: { base: "auto 980px", md: "auto 630px" } },
    "& > :nth-child(6)": { containIntrinsicSize: { base: "auto 560px", md: "auto 380px" } },
    "& > :nth-child(7)": {
      containIntrinsicSize: { base: "auto 1440px", md: "auto 1130px", lg: "auto 770px" },
    },
    "& > :nth-child(8)": { containIntrinsicSize: "auto 590px" },
  },
});

/**
 * More detail and the questions: stacked, then side by side on wide screens on one canvas band.
 * Owned by the bands (HomeMoreDetail, HomeFAQ); adjust here only for the pair's layout.
 */
export const pairBands = cva({
  base: {
    backgroundColor: "surface.canvas",
    // One centred column, wider than a single band's and never edge to edge, with a clear gutter
    // between the two lists (prototype 11). Each half hides its bubble field here (MK8).
    lg: {
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
      columnGap: "8",
      alignItems: "start",
      maxWidth: "7xl",
      mx: "auto",
    },
  },
});
