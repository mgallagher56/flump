import { css, cva } from "@repo/ui/styled-system/css";

/*
 * Prototype 10's closing pile (`p10-deck` in its `hero.css`): a 20rem by 9rem box, 30rem by 12rem
 * from 768px. Its pieces were em-sized at 5.5px, then 8px; production's pieces are drawn at about
 * 15px to the em, so the layer scales them by 5.5/15, then 8/15. The box is a fixed size, so the
 * stack takes the same room before and after any motion, and with no script.
 */
export const stack = css({
  position: "relative",
  width: "20rem",
  maxWidth: "full",
  height: "9rem",
  mx: "auto",
  "--stack-scale": "0.3667",
  md: { width: "30rem", height: "12rem", "--stack-scale": "0.5333" },
});

/** A point at the box's centre, scaled, that the pieces are placed around. */
export const stackLayer = css({
  position: "absolute",
  left: "50%",
  top: "50%",
  width: "0",
  height: "0",
  transform: "scale(var(--stack-scale))",
});

const centred =
  "translate(calc(var(--piece-x) / var(--stack-scale) - 50%), calc(var(--piece-y) / var(--stack-scale) - 50%))";

/**
 * Each piece centred on the box plus prototype 10's offset (its `margin-left` and `margin-top`, in
 * rem, so the spread does not grow with the pieces), upright: the pile at rest in prototype 10 once
 * its gather has run, as the owner saw it. The payslip hangs from the centre line, half its height
 * lower than the others, as it does there.
 */
export const stackPiece = cva({
  base: {
    position: "absolute",
    left: "0",
    top: "0",
    fontFamily: "body",
    lineHeight: "1.2",
    transform: centred,
  },
  variants: {
    k: {
      statement: { "--piece-x": "-6.2rem", "--piece-y": "0.4rem" },
      payslip: {
        "--piece-x": "-3.6rem",
        "--piece-y": "-0.2rem",
        transform:
          "translate(calc(var(--piece-x) / var(--stack-scale) - 50%), calc(var(--piece-y) / var(--stack-scale)))",
      },
      receipt: { "--piece-x": "-1.2rem", "--piece-y": "0.6rem" },
      pension: { "--piece-x": "1.4rem", "--piece-y": "0.2rem" },
      credit: { "--piece-x": "3.8rem", "--piece-y": "0.9rem" },
      card: { "--piece-x": "6.2rem", "--piece-y": "0.5rem" },
    },
  },
});
