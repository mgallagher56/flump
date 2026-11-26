import type { CSSProperties, FC, ReactNode } from "react";
import { DEBT } from "../../p8/sceneData";
import { balanceOf, formatGbp, SAMPLE_ACCOUNTS, SAMPLE_DASHBOARD } from "../../shared/sampleData";
import { PIECES } from "../hero/Pieces";
import { FIG } from "../hero/pieceData";
import "../hero/pieces.css";
import "./pictures.css";

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

/** A dotted arc, the live scenes' "dots" path. */
const Arc: FC<{ d: string; viewBox?: string; className?: string }> = ({
  d,
  viewBox = "0 0 220 160",
  className = "",
}) => (
  <svg aria-hidden="true" className={`p11-pic__arc ${className}`} viewBox={viewBox}>
    <path d={d} />
  </svg>
);

/** A three-leaf sprout, the live scenes' "sprout". */
const Sprout: FC<{ className?: string }> = ({ className = "" }) => (
  <svg aria-hidden="true" className={`p11-pic__sprout ${className}`} viewBox="0 0 40 44">
    <path className="p11-pic__stem" d="M20 44V18" />
    <path className="p11-pic__leaf" d="M20 24C10 24 4 18 4 8c10 0 16 6 16 16z" />
    <path className="p11-pic__leaf p11-pic__leaf--b" d="M20 20c0-10 6-16 16-16 0 10-6 16-16 16z" />
    <path className="p11-pic__leaf p11-pic__leaf--c" d="M20 14c-4-4-4-9 0-14 4 5 4 10 0 14z" />
  </svg>
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

/** One of the hero's own pieces, placed as a layer. */
const Layer: FC<{ k: keyof typeof PIECES; className?: string; style?: CSSProperties }> = ({
  k,
  className = "",
  style,
}) => {
  const Body = PIECES[k];
  return (
    <div className={`p11-piece p11-pic__layer ${className}`} style={style}>
      <Body />
    </div>
  );
};

/* ---------------------------------------------------------------------------------------------
 * empty-accounts: "Stacked cards, nothing linked yet".
 * ------------------------------------------------------------------------------------------- */

export const EmptyAccountsPicture: FC<{ decorative?: boolean }> = ({ decorative }) => (
  <Frame
    decorative={decorative}
    label="Example account cards stacked, with a space for the next one. No bank login is needed."
    scene="empty-accounts"
  >
    <div className="p11-pic__slot p11-pic__layer" style={{ left: "9em", top: "0.4em" }}>
      <span>Add an account</span>
    </div>
    <AccountCard
      figure={FIG.card}
      meta={`${FIG.cardRate}`}
      name="Credit card"
      style={{ left: "4.4em", top: "2.2em", rotate: "4deg" }}
      tone="credit"
    />
    <AccountCard
      figure={FIG.savings}
      meta={FIG.savingsRate}
      name="Cash and savings"
      style={{ left: "0.4em", top: "5em", rotate: "-3deg" }}
    />
    <span className="p11-pic__chip" style={{ right: "0.2em", bottom: "0.6em" }}>
      No bank login
    </span>
  </Frame>
);

/* ---------------------------------------------------------------------------------------------
 * empty-goals: "A target with a flag on top".
 * ------------------------------------------------------------------------------------------- */

export const EmptyGoalsPicture: FC<{ decorative?: boolean }> = ({ decorative }) => (
  <Frame decorative={decorative} label="A goal card with a target and a flag." scene="empty-goals">
    <div className="p11-paper p11-pic__layer p11-pic-goal" style={{ left: "3em", top: "1em" }}>
      <div className="p11-paper__head">
        <span className="p11-paper__title">Your first goal</span>
        <Example />
      </div>
      <div aria-hidden="true" className="p11-pic-goal__target">
        <span />
        <span />
        <span />
        <i className="p11-pic-goal__pole" />
        <i className="p11-pic-goal__flag" />
      </div>
      <p className="p11-pic-goal__note">Set a target and a date</p>
      <span className="p11-paper__sheen" />
    </div>
  </Frame>
);

/* ---------------------------------------------------------------------------------------------
 * empty-savings: "Savings jar with stacked coins waiting inside".
 * ------------------------------------------------------------------------------------------- */

export const EmptySavingsPicture: FC<{ decorative?: boolean }> = ({ decorative }) => (
  <Frame
    decorative={decorative}
    label={`An example savings jar holding ${FIG.savings} at ${FIG.savingsRate}.`}
    scene="empty-savings"
  >
    <div className="p11-piece p11-pic__layer" style={{ left: "5.5em", top: "0.6em" }}>
      <div className="p11-jar p11-pic-jar" style={{ "--p11-fill": "34%" } as CSSProperties}>
        <span className="p11-jar__lid" />
        <span className="p11-jar__glass">
          <span aria-hidden="true" className="p11-pic-jar__coins">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="p11-jar__label">
            <span className="p11-jar__name">Cash and savings</span>
            <span className="p11-jar__figure tabular-nums">{FIG.savings}</span>
            <span className="p11-pic-jar__meta tabular-nums">{FIG.savingsRate}</span>
          </span>
          <span className="p11-jar__glint" />
        </span>
      </div>
    </div>
    <span className="p11-pic__chip" style={{ left: "0.6em", bottom: "1em" }}>
      Example
    </span>
  </Frame>
);

/* ---------------------------------------------------------------------------------------------
 * empty-debt: "Stepping stones lowering toward zero".
 * ------------------------------------------------------------------------------------------- */

const midDebt = DEBT.points.find(
  (p) => p.month === 0 && p.year === (DEBT.points[0]?.year ?? 0) + 2,
);

export const EmptyDebtPicture: FC<{ decorative?: boolean }> = ({ decorative }) => {
  const steps = [
    { when: DEBT.startLabel, value: formatGbp(DEBT.start) },
    ...(midDebt
      ? [{ when: midDebt.long, value: formatGbp(Math.round(midDebt.value / 100) * 100) }]
      : []),
    { when: DEBT.endLabel, value: formatGbp(0) },
  ];
  return (
    <Frame
      decorative={decorative}
      label={`Example card and loan balance stepping down: ${steps.map((s) => `${s.value} in ${s.when}`).join(", ")}.`}
      scene="empty-debt"
    >
      <Arc className="p11-pic-debt__arc" d="M30 30C80 40 120 70 200 128" />
      {steps.map((step, i) => (
        <div
          className="p11-paper p11-pic__layer p11-pic-debt__step"
          key={step.when}
          style={{ left: `${0.2 + i * 7.2}em`, top: `${0.4 + i * 3.6}em` }}
        >
          <span className="p11-pic-debt__when">{step.when}</span>
          <span className="p11-pic-debt__value tabular-nums">{step.value}</span>
          {i === 0 && <Example />}
          <span className="p11-paper__sheen" />
        </div>
      ))}
    </Frame>
  );
};

/* ---------------------------------------------------------------------------------------------
 * empty-pension: "Potted sprout waiting for pension pots".
 * ------------------------------------------------------------------------------------------- */

export const EmptyPensionPicture: FC<{ decorative?: boolean }> = ({ decorative }) => (
  <Frame
    decorative={decorative}
    label={`A sprout growing in a pot labelled pension, ${FIG.pension}, example.`}
    scene="empty-pension"
  >
    <Sprout className="p11-pic-pot__sprout" />
    <div className="p11-pic-pot p11-pic__layer">
      <span className="p11-pic-pot__rim" />
      <span className="p11-pic-pot__body">
        <span className="p11-jar__label p11-pic-pot__label">
          <span className="p11-jar__name">Pension</span>
          <span className="p11-jar__figure tabular-nums">{FIG.pension}</span>
          <Example />
        </span>
      </span>
    </div>
  </Frame>
);

/* ---------------------------------------------------------------------------------------------
 * check-in and check-in-done: the monthly calendar card, today marked; then stamped.
 * ------------------------------------------------------------------------------------------- */

const CHECK_IN_ROWS = [
  { label: "Cash and savings", value: balanceOf(SAMPLE_ACCOUNTS.savings) },
  { label: "Pension", value: balanceOf(SAMPLE_ACCOUNTS.pension) },
  { label: "Credit card", value: balanceOf(SAMPLE_ACCOUNTS.creditCard) },
];
/** November 2026 starts on a Sunday: six blanks in a week that starts on Monday. */
const LEAD_BLANKS = 6;
const DAYS = 30;
const TODAY = 26;

const Calendar: FC<{ done?: boolean }> = ({ done }) => (
  <div className="p11-paper p11-pic__layer p11-art-checkin__card">
    <div className="p11-statement__letterhead p11-pic-cal__head">
      <span className="p11-paper__title">November 2026</span>
      <Example />
    </div>
    <ol aria-hidden="true" className="p11-art-checkin__days">
      {Array.from({ length: LEAD_BLANKS }, (_, i) => (
        <li className="p11-art-checkin__blank" key={`b${i}`} />
      ))}
      {Array.from({ length: DAYS }, (_, i) => (
        <li
          className="p11-art-checkin__day tabular-nums"
          data-today={i + 1 === TODAY ? "" : undefined}
          key={i}
        >
          {i + 1}
        </li>
      ))}
    </ol>
    <dl className="p11-rows tabular-nums p11-art-checkin__rows">
      {CHECK_IN_ROWS.map((row) => (
        <div className="p11-art-checkin__row" key={row.label}>
          <dt>
            {done && <span aria-hidden="true" className="p11-art-checkin__tick" />}
            {row.label}
          </dt>
          <dd>{formatGbp(row.value)}</dd>
        </div>
      ))}
    </dl>
    <span className="p11-paper__sheen" />
  </div>
);

export const CheckInPicture: FC<{ decorative?: boolean }> = ({ decorative }) => (
  <Frame
    className="p11-art-checkin"
    decorative={decorative}
    label="Example monthly check-in for 26 November 2026, asking for three balances."
    scene="check-in"
  >
    <Layer className="p11-pic-cal__behind" k="receipt" />
    <Calendar />
  </Frame>
);

export const CheckInDonePicture: FC<{ decorative?: boolean }> = ({ decorative }) => (
  <Frame
    className="p11-art-checkin"
    decorative={decorative}
    label="Example monthly check-in for 26 November 2026, done: three balances updated."
    scene="check-in-done"
  >
    <Layer className="p11-pic-cal__behind" k="receipt" />
    <Calendar done />
    <span className="p11-pic-stamp">
      <span>Checked in</span>
      <span className="tabular-nums">26 Nov</span>
    </span>
  </Frame>
);

/* ---------------------------------------------------------------------------------------------
 * onboarding: "Three rising steps with a sprout: the start of something".
 * ------------------------------------------------------------------------------------------- */

const STEPS = [
  { label: "Rough figures", detail: `${FIG.comesIn} in` },
  { label: "Your picture", detail: `${FIG.netWorth} net worth` },
  { label: "Check in", detail: "Once a month" },
] as const;

export const OnboardingPicture: FC<{ decorative?: boolean }> = ({ decorative }) => (
  <Frame
    className="p11-art-steps"
    decorative={decorative}
    label="Three rising steps: rough figures, your picture, check in. A sprout grows on the tallest."
    scene="onboarding"
  >
    <Arc className="p11-pic-steps__arc" d="M24 108C60 66 110 50 168 36" />
    <ol className="p11-art-steps__list">
      {STEPS.map((step, i) => (
        <li className="p11-paper p11-art-steps__step" data-step={i + 1} key={step.label}>
          <span className="p11-art-steps__num tabular-nums">{i + 1}</span>
          <span className="p11-art-steps__label">{step.label}</span>
          <span className="p11-art-steps__detail tabular-nums">{step.detail}</span>
          <span className="p11-paper__sheen" />
        </li>
      ))}
    </ol>
    <Sprout className="p11-art-steps__sprout" />
  </Frame>
);

/* ---------------------------------------------------------------------------------------------
 * not-found: "A signpost that points two ways".
 * ------------------------------------------------------------------------------------------- */

export const NotFoundPicture: FC<{ decorative?: boolean }> = ({ decorative }) => (
  <Frame
    decorative={decorative}
    label="A signpost pointing two ways: to the home page and to Flump features."
    scene="not-found"
  >
    <span className="p11-pic-sign__post" />
    <span className="p11-paper p11-pic-sign p11-pic-sign--right">
      Home page
      <span className="p11-paper__sheen" />
    </span>
    <span className="p11-paper p11-pic-sign p11-pic-sign--left">
      Flump features
      <span className="p11-paper__sheen" />
    </span>
    <span className="p11-pic-sign__ground" />
  </Frame>
);

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
  "savings-and-pension": PIECES.pension,
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
  { scene: "empty-goals", subject: "A target with a flag on top", Picture: EmptyGoalsPicture },
  {
    scene: "empty-savings",
    subject: "Savings jar with coins waiting inside",
    Picture: EmptySavingsPicture,
  },
  {
    scene: "empty-debt",
    subject: "Stepping stones lowering toward zero",
    Picture: EmptyDebtPicture,
  },
  {
    scene: "empty-pension",
    subject: "Potted sprout waiting for pension pots",
    Picture: EmptyPensionPicture,
  },
  {
    scene: "check-in",
    subject: "Monthly calendar card, today's check-in marked",
    Picture: CheckInPicture,
  },
  {
    scene: "check-in-done",
    subject: "The calendar card, stamped done",
    Picture: CheckInDonePicture,
  },
  { scene: "onboarding", subject: "Three rising steps with a sprout", Picture: OnboardingPicture },
  { scene: "not-found", subject: "A signpost that points two ways", Picture: NotFoundPicture },
] as const;
