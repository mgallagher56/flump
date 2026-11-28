import type { FC } from "react";
import type { PieceKey } from "../HomeHero/heroData";
import { MoneyPiece } from "../MoneyPieces";
import { stack, stackLayer, stackPiece } from "./CloseStack.styles";

/** Prototype 10's pile, back to front: the savings card last, so it sits in front. */
export const STACK_ORDER: readonly PieceKey[] = [
  "statement",
  "payslip",
  "receipt",
  "pension",
  "credit",
  "card",
];

/**
 * Where each piece starts its gather, in screen pixels and degrees: prototype 10's `closingMoment`
 * (`p10/Rest.tsx`), in `STACK_ORDER`. Every tilt is six degrees or less (STYLE-GUIDE 8.3).
 */
export const STACK_SCATTER: readonly { x: number; y: number; rotation: number }[] = [
  { x: -70, y: -24, rotation: -6 },
  { x: 64, y: -20, rotation: 5 },
  { x: -52, y: 18, rotation: -4 },
  { x: 56, y: 22, rotation: 6 },
  { x: -28, y: -30, rotation: -5 },
  { x: 34, y: 26, rotation: 4 },
];

/**
 * The close's picture (owner, 28 Nov 2026, from prototype 10's closing band): the hero's six
 * pieces of a household's money gathered into one pile, each with its "Example" tag in real text.
 * Decorative: it repeats the hero's pieces and the close's words carry the meaning, so it is
 * hidden from assistive technology. The server render is the pile at rest; `closeMoment` gathers
 * it once, by time, and never runs under reduced motion.
 */
export const CloseStack: FC = () => (
  <div aria-hidden="true" className={stack} data-close-stack="" data-testid="close-stack">
    <div className={stackLayer}>
      {STACK_ORDER.map((k) => (
        <div className={stackPiece({ k })} data-close-piece={k} key={k}>
          <MoneyPiece k={k} />
        </div>
      ))}
    </div>
  </div>
);
