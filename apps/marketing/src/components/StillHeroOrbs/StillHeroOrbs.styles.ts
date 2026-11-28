import { css, cva } from "@repo/ui/styled-system/css";

/*
 * The hero's four orbs, placed as the approved prototypes' `heroLayout` places them, in CSS so the
 * server render already shows them (MK1, MK11). The stage is a size container (`SceneStage` with
 * `fit="band"`), so sizes follow the band's height as the prototype's do: the big orb is 46% of the
 * band's height, at most 260px, and the others are shares of it (written out each time: Panda
 * extracts styles statically). Beside the copy from 48rem; on
 * phones a row on the shelf under the calls to action (the hero leaves room for it). Every orb sits
 * wholly inside the band, clear of the copy.
 */
export const orbPlace = cva({
  // A wrapper around the orb, which sets its size through `--orb-size` (inherited).
  base: { position: "absolute", display: "block", lineHeight: "0", translate: "-50% -50%" },
  variants: {
    slot: {
      0: {
        left: "20%",
        top: "calc(100% - 64px)",
        "--orb-size": "84px",
        "@media (min-width: 48rem)": { left: "82%", top: "46%", "--orb-size": "min(46cqh, 260px)" },
        "@media (min-width: 64rem)": { left: "76%" },
      },
      1: {
        left: "47%",
        top: "calc(100% - 50px)",
        "--orb-size": "46px",
        "@media (min-width: 48rem)": {
          left: "93%",
          top: "20%",
          "--orb-size": "calc(min(46cqh, 260px) * 0.42)",
        },
      },
      2: {
        left: "74%",
        top: "calc(100% - 70px)",
        "--orb-size": "96px",
        "@media (min-width: 48rem)": {
          left: "72%",
          top: "80%",
          "--orb-size": "calc(min(46cqh, 260px) * 0.3)",
        },
        "@media (min-width: 64rem)": { left: "62%" },
      },
      3: {
        left: "93%",
        top: "calc(100% - 44px)",
        "--orb-size": "30px",
        "@media (min-width: 48rem)": {
          left: "95%",
          top: "80%",
          "--orb-size": "calc(min(46cqh, 260px) * 0.18)",
        },
      },
    },
  },
});

/**
 * The still stage (scene level S0, the approved pricing, preview, security and contact
 * prototypes): fills its positioned band behind the content, as a size container so the orbs size
 * themselves in the band's own units, as `SceneStage`'s band stage does. Nothing takes the pointer.
 */
export const stillStage = css({
  position: "absolute",
  inset: "0",
  zIndex: "-1",
  pointerEvents: "none",
  overflow: "hidden",
  containerType: "size",
});
