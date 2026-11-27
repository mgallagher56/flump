import type { CSSProperties, FC, ReactNode } from "react";
import { SAMPLE_DASHBOARD } from "../../shared/sampleData";
import { PIECES } from "../hero/Pieces";
import { FIG } from "../hero/pieceData";
import "../hero/pieces.css";
import "./pictures.css";
import {
  CheckInB,
  CheckInDoneA,
  DebtA,
  GoalsA,
  NotFoundB,
  OnboardingB,
  PensionA,
  type Pic,
  SavingsB,
  TileSavingsPensionB,
} from "./round6/Round6";

/*
 * Prototype 11's pictures, in the hero pieces' family (layered paper and cards with real sample
 * content, soft depth and light, "Example" tags). They replace the live site's flat spot
 * illustrations (packages/ui Illustration scenes) and keep each one's subject. Sizes are in em:
 * the picture's font size (14 to 15px) keeps the smallest text at about 12px or more.
 *
 * Every picture is a figure whose text is real; `decorative` hides it from screen readers where
 * the words beside it already say the same.
 */

const Example: FC = () => <span className="p11-ex p11-ex--paper">Example</span>;

const Frame: FC<{
  scene: string;
  label: string;
  decorative?: boolean;
  className?: string;
  children: ReactNode;
}> = ({ scene, label, decorative, className = "", children }) => (
  <figure
    aria-hidden={decorative ? "true" : undefined}
    aria-label={decorative ? undefined : label}
    className={`p11-pic p11-pic--${scene} ${className}`}
    data-scene={scene}
    role={decorative ? undefined : "img"}
  >
    <div className="p11-pic__stage">{children}</div>
  </figure>
);

/** A payment card in the pieces' style. */
const AccountCard: FC<{
  name: string;
  figure: string;
  meta: string;
  tone?: "savings" | "credit";
  className?: string;
  style?: CSSProperties;
}> = ({ name, figure, meta, tone = "savings", className = "", style }) => (
  <div className={`p11-piece p11-pic__layer ${className}`} style={style}>
    <div className={`p11-card p11-card--${tone}`}>
      <div className="p11-card__edge" />
      <div className="p11-card__face">
        <div className="p11-card__top">
          <span className="p11-card__bank">{name}</span>
          <span className="p11-ex p11-ex--dark">Example</span>
        </div>
        <span className={tone === "credit" ? "p11-card__wave" : "p11-card__chip"} />
        <span className="p11-card__figure tabular-nums">{figure}</span>
        <span className="p11-card__meta tabular-nums">{meta}</span>
        <span className="p11-card__sheen" />
      </div>
    </div>
  </div>
);

/* ---------------------------------------------------------------------------------------------
 * empty-accounts: "Stacked cards, nothing linked yet".
 * ------------------------------------------------------------------------------------------- */

export const EmptyAccountsPicture: FC<{ decorative?: boolean }> = ({ decorative }) => (
  <Frame
    decorative={decorative}
    label="Example account cards stacked, with a space for the next one. No bank login is needed."
    scene="empty-accounts"
  >
    <div className="p11-pic__slot p11-pic__layer" style={{ left: "9em", top: "0" }}>
      <span>Add an account</span>
    </div>
    <AccountCard
      figure={FIG.card}
      meta={`${FIG.cardRate}`}
      name="Credit card"
      style={{ left: "4.4em", top: "1.5em", rotate: "4deg" }}
      tone="credit"
    />
    <AccountCard
      figure={FIG.savings}
      meta={FIG.savingsRate}
      name="Cash and savings"
      style={{ left: "0.4em", top: "6.2em", rotate: "-3deg" }}
    />
    <span className="p11-pic__chip" style={{ right: "0.2em", bottom: "0.6em" }}>
      No bank login
    </span>
  </Frame>
);

/* ---------------------------------------------------------------------------------------------
 * The owner's picks from round six (see round6/Round6.tsx): cards and paper documents.
 * ------------------------------------------------------------------------------------------- */

/** empty-goals: a blank "New goal" slip with a pennant. */
export const EmptyGoalsPicture: Pic = GoalsA;
/** empty-savings: one savings document with its year as a line. */
export const EmptySavingsPicture: Pic = SavingsB;
/** empty-debt: the credit card with a "Paying off" slip. */
export const EmptyDebtPicture: Pic = DebtA;
/** empty-pension: a pension statement. */
export const EmptyPensionPicture: Pic = PensionA;
/** check-in: a calendar page for 26 November with a "Check-in day" tag. */
export const CheckInPicture: Pic = CheckInB;
/** check-in-done: the monthly check-in slip, ticked, "Updated 26 November". */
export const CheckInDonePicture: Pic = CheckInDoneA;
/** onboarding: the "Getting started" ticket in three parts. */
export const OnboardingPicture: Pic = OnboardingB;
/** not-found: a "Where next?" card with two direction tabs. */
export const NotFoundPicture: Pic = NotFoundB;

/* ---------------------------------------------------------------------------------------------
 * Security (replaces the strip's shield icon tile): a paper card that says what Flump can and
 * cannot do, with a seal. Decorative: the sentence beside it says the same.
 * ------------------------------------------------------------------------------------------- */

export const SecurityPicture: FC = () => (
  <Frame decorative label="" scene="security">
    <div className="p11-paper p11-pic__layer p11-pic-sec">
      <div className="p11-statement__letterhead">
        <span className="p11-statement__mark" />
        <span className="p11-paper__title">Your figures</span>
      </div>
      <dl className="p11-rows">
        <div>
          <dt>Bank login</dt>
          <dd>Not needed</dd>
        </div>
        <div>
          <dt>Payments</dt>
          <dd>None</dd>
        </div>
        <div className="p11-rows__total">
          <dt>Typed in by</dt>
          <dd>You</dd>
        </div>
      </dl>
      <span className="p11-paper__sheen" />
    </div>
    <span className="p11-pic-seal">
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" />
        <path className="p11-pic-seal__tick" d="M8.5 12l2.4 2.4 4.6-4.8" />
      </svg>
    </span>
  </Frame>
);

/* ---------------------------------------------------------------------------------------------
 * The features tiles' cards: one small piece per area.
 * ------------------------------------------------------------------------------------------- */

const QuestionCard: FC = () => (
  <div className="p11-paper p11-pic-qa">
    <div className="p11-paper__head">
      <span className="p11-paper__title">Ask about your figures</span>
      <Example />
    </div>
    <p className="p11-pic-qa__q">How long would my savings cover the essentials?</p>
    <p className="p11-pic-qa__a tabular-nums">
      {SAMPLE_DASHBOARD.monthsOfCover !== null
        ? `About ${FIG.breathingRoom?.replace(/^About /, "") ?? ""}, from your saved figures.`
        : "From your saved figures."}
    </p>
    <span className="p11-paper__sheen" />
  </div>
);

const TILE_PIECES: Record<string, FC> = {
  accounts: PIECES.card,
  budget: PIECES.receipt,
  pay: PIECES.payslip,
  "savings-and-pension": TileSavingsPensionB,
  "debt-and-borrowing": PIECES.credit,
  "ai-connection": QuestionCard,
};

/** A features tile's image: the area's piece, decorative (the tile's text names the area). */
export const TilePicture: FC<{ area: string }> = ({ area }) => {
  const Body = TILE_PIECES[area];
  if (!Body) return null;
  return (
    <div aria-hidden="true" className="p11-tile-pic" data-area={area}>
      <div className="p11-piece">
        <Body />
      </div>
    </div>
  );
};

/** Every live scene, its new picture, for the image sheet. */
export const SCENE_PICTURES = [
  {
    scene: "empty-accounts",
    subject: "Stacked cards, nothing linked yet",
    Picture: EmptyAccountsPicture,
  },
  { scene: "empty-goals", subject: "A blank goal slip with a pennant", Picture: EmptyGoalsPicture },
  {
    scene: "empty-savings",
    subject: "A savings document with its year as a line",
    Picture: EmptySavingsPicture,
  },
  {
    scene: "empty-debt",
    subject: "The credit card with a paying-off slip",
    Picture: EmptyDebtPicture,
  },
  {
    scene: "empty-pension",
    subject: "A pension statement",
    Picture: EmptyPensionPicture,
  },
  {
    scene: "check-in",
    subject: "A calendar page with a check-in day tag",
    Picture: CheckInPicture,
  },
  {
    scene: "check-in-done",
    subject: "The monthly check-in slip, ticked",
    Picture: CheckInDonePicture,
  },
  {
    scene: "onboarding",
    subject: "A getting started ticket in three parts",
    Picture: OnboardingPicture,
  },
  { scene: "not-found", subject: "A card with two direction tabs", Picture: NotFoundPicture },
] as const;
