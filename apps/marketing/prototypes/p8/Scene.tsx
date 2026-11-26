import { type FC, type ReactNode, type RefObject, useRef } from "react";
import { Link } from "react-router-dom";
import { bandLink } from "../../src/pages/HomePage/HomePage.styles";
import { MONEY_AREAS, type MoneyAreaKey } from "../../src/utils/featureAreas";
import type { GsapKit } from "../shared/gsapKit";
import { type PaceState, usePace } from "../shared/pace";
import { Bubbles } from "../shared/round3";
import { useGsap } from "../shared/useGsap";
import { arrive } from "./calm";
import { Piece } from "./Pieces";
import type { PieceKey } from "./pieceData";

const SHORT: Record<MoneyAreaKey, string> = {
  accounts: "Accounts",
  budget: "Budget",
  pay: "Pay",
  "savings-and-pension": "Savings",
  "debt-and-borrowing": "Debt",
};

/** Each area keeps the piece it was made from in the hero, so the page reads as one story. */
const AREA_PIECE: Record<MoneyAreaKey, PieceKey> = {
  accounts: "card",
  budget: "receipt",
  pay: "payslip",
  "savings-and-pension": "pension",
  "debt-and-borrowing": "statement",
};

export type SceneSetup = (
  kit: GsapKit,
  root: HTMLElement,
  pace: PaceState,
) => (() => void) | undefined;

/**
 * One area's section (prototype 5's scenes): its hero piece, heading, lead, a sentence on the
 * example, the link to its feature page, and a stage with the area's scene. The text arrives
 * gently (rise and fade); the scene's own moment is `setup`, rebuilt when the pace changes.
 */
export const Scene: FC<{
  areaKey: MoneyAreaKey;
  note: ReactNode;
  children: ReactNode;
  layout?: "left" | "right" | "wide";
  tone?: "canvas" | "card";
  bubbles?: "a" | "b" | "c";
  setup: SceneSetup;
}> = ({ areaKey, note, children, layout = "left", tone = "canvas", bubbles, setup }) => {
  const area = MONEY_AREAS.find((a) => a.key === areaKey);
  const ref = useRef<HTMLElement>(null);
  const pace = usePace();
  useGsap(
    ref as RefObject<HTMLElement | null>,
    (kit, root) => {
      arrive(kit, root.querySelectorAll(".p8-s-scene__text > *"), pace);
      arrive(kit, root.querySelectorAll("[data-p8-arrive]"), pace, 20);
      return setup(kit, root, pace) ?? undefined;
    },
    [pace.pace],
  );
  if (!area) return null;
  const titleId = `p8-${areaKey}-title`;
  return (
    <section
      aria-labelledby={titleId}
      className={`p8-s-scene p8-s-scene--${layout} p8-s-scene--${tone}`}
      data-enhanced="false"
      data-proto-name={SHORT[areaKey]}
      data-proto-section=""
      id={`p8-${areaKey}`}
      ref={ref}
    >
      <div className="p8-s-scene__inner">
        <div className="p8-s-scene__text">
          <div aria-hidden="true" className="p8-s-scene__piece">
            <Piece className="p8-piece--mini" k={AREA_PIECE[areaKey]} />
          </div>
          <h2 className="p8-s-scene__title" id={titleId}>
            {area.h1}
          </h2>
          <p className="p8-s-scene__lead">{area.lead}</p>
          <p className="p8-s-scene__note">{note}</p>
          <Link className={`${bandLink()} p8-s-scene__link`} to={area.path}>
            About {area.name.toLowerCase()} in Flump
          </Link>
        </div>
        <div className="p8-s-scene__stage">
          {bubbles && <Bubbles layout={bubbles} />}
          {children}
        </div>
      </div>
    </section>
  );
};

/** Text for screen readers only (the visible copy is an animated, hidden duplicate). */
export const Sr: FC<{ children: ReactNode }> = ({ children }) => (
  <span className="p8-s-sr">{children}</span>
);
