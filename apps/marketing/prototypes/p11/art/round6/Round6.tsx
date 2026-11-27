import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { CSSProperties, FC, ReactNode } from "react";
import { DEBT, formatGbpPence, PAYSLIP, SAVINGS } from "../../../p8/sceneData";
import { balanceOf, formatGbp, SAMPLE_ACCOUNTS, SAMPLE_BUDGET } from "../../../shared/sampleData";
import { FIG } from "../../hero/pieceData";
import "../../hero/pieces.css";
import "./round6.css";

/*
 * Round six of prototype 11's spot pictures, in the style of empty-accounts and the features
 * tiles: tilted cards and paper documents carrying real sample content, flat material, a soft
 * shadow, an Example tag on any sample figure. No glass, no orbs. Built from the hero pieces'
 * classes (p11-card, p11-paper, p11-rows). The frame sizes its em to its container, so the
 * smallest text is held at 12px or more at any width. Nothing moves.
 */

/** A picture: `decorative` hides it from screen readers where the words beside it say the same. */
export type Pic = FC<{ decorative?: boolean }>;

const Frame: FC<{
  scene: string;
  label: string;
  h: number;
  decorative?: boolean;
  children: ReactNode;
}> = ({ scene, label, h, decorative, children }) => (
  <div className="p11-r6-fit">
    <figure
      aria-hidden={decorative ? "true" : undefined}
      aria-label={decorative ? undefined : label}
      className={`p11-r6 p11-r6--${scene}`}
      role={decorative ? undefined : "img"}
    >
      <div className="p11-r6__stage" style={{ "--h": `${h}em` } as CSSProperties}>
        {children}
      </div>
    </figure>
  </div>
);

/** Stage units (the stage's em), whatever a child's own font size. */
const u = (n: number) => `calc(var(--p11-r6-u) * ${n})`;
/** Left, top, width (stage units) and a tilt in degrees. */
const at = (l: number, t: number, w?: number, tilt?: number): CSSProperties => ({
  left: u(l),
  top: u(t),
  ...(w !== undefined ? { width: u(w) } : {}),
  ...(tilt !== undefined ? { rotate: `${tilt}deg` } : {}),
});

const Example: FC<{ dark?: boolean }> = ({ dark }) => (
  <span className={`p11-ex ${dark ? "p11-ex--dark" : "p11-ex--paper"}`}>Example</span>
);

/** A paper document: a head (title and optional Example), then its body. */
const Paper: FC<{
  title?: ReactNode;
  example?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}> = ({ title, example, className = "", style, children }) => (
  <div className={`p11-paper p11-r6-paper ${className}`} style={style}>
    {(title || example) && (
      <div className="p11-paper__head">
        {title && <span className="p11-paper__title">{title}</span>}
        {example && <Example />}
      </div>
    )}
    {children}
    <span className="p11-paper__sheen" />
  </div>
);

/** A payment-card shaped card, as on empty-accounts. */
const BankCard: FC<{
  name: string;
  figure: string;
  meta: string;
  tone: "savings" | "credit" | "pension" | "goal";
  mark?: "chip" | "wave" | "none";
  style?: CSSProperties;
  children?: ReactNode;
}> = ({ name, figure, meta, tone, mark = "chip", style, children }) => (
  <div className={`p11-piece p11-r6-cardwrap p11-r6-cardwrap--${tone}`} style={style}>
    <div className={`p11-card p11-card--${tone === "savings" ? "savings" : "credit"} p11-r6-card`}>
      <div className="p11-card__edge" />
      <div className="p11-card__face">
        <div className="p11-card__top">
          <span className="p11-card__bank">{name}</span>
          <Example dark />
        </div>
        {mark === "chip" && <span className="p11-card__chip" />}
        {mark === "wave" && <span className="p11-card__wave" />}
        {mark === "none" && <span />}
        <span className="p11-card__figure tabular-nums">{figure}</span>
        <span className="p11-card__meta tabular-nums">{meta}</span>
        {children}
        <span className="p11-card__sheen" />
      </div>
    </div>
  </div>
);

/** A dashed empty place, waiting for something to be added. */
const Slot: FC<{ style: CSSProperties; children: ReactNode }> = ({ style, children }) => (
  <span className="p11-r6-slot" style={style}>
    {children}
  </span>
);

/** A small flat tick in a mint circle. */
const Tick: FC = () => (
  <span aria-hidden="true" className="p11-r6-tick">
    <Check strokeWidth={3} />
  </span>
);

/** A small line drawn from values, for the savings history. */
const Spark: FC<{ values: readonly number[]; className?: string }> = ({
  values,
  className = "",
}) => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const d = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 28 - ((v - min) / (max - min || 1)) * 24;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      aria-hidden="true"
      className={`p11-r6-spark ${className}`}
      preserveAspectRatio="none"
      viewBox="0 0 100 30"
    >
      <path d={d} />
    </svg>
  );
};

/* ---------------------------------------------------------------------------------------------
 * Figures, all from the sample household.
 * ------------------------------------------------------------------------------------------- */

const cashSaving = SAMPLE_BUDGET.outgoings.find((o) => o.label === "Cash saving")?.amount ?? 0;
/** An example goal: a year of the household's own monthly cash saving. */
const GOAL_TARGET = cashSaving * 12;
const GOAL_BY = (() => {
  const end = SAVINGS.points.at(-1)?.long ?? "";
  const [month, year] = end.split(" ");
  return month && year ? `${month} ${Number(year) + 1}` : "";
})();
const midDebt = DEBT.points.find(
  (p) => p.month === 0 && p.year === (DEBT.points[0]?.year ?? 0) + 2,
);
const pensionMonthly = PAYSLIP.rows.find((r) => r.id === "pension");
const together = balanceOf(SAMPLE_ACCOUNTS.savings) + balanceOf(SAMPLE_ACCOUNTS.pension);
const lastThree = SAVINGS.points.slice(-3);

/* =============================================================================================
 * empty-goals
 * =========================================================================================== */

/** A: a blank goal card, its fields waiting, a pennant tab on top. */
export const GoalsA: Pic = ({ decorative }) => (
  <Frame
    decorative={decorative}
    h={15}
    label="A blank goal card with a pennant: a target and a date to fill in, and an empty progress bar."
    scene="goals-a"
  >
    <Paper className="p11-r6-goal" style={at(3, 1.6, 16, -3)} title="New goal">
      <span aria-hidden="true" className="p11-r6-pennant" />
      <dl className="p11-r6-fields">
        <div>
          <dt>Target</dt>
          <dd className="p11-r6-blank" />
        </div>
        <div>
          <dt>By</dt>
          <dd className="p11-r6-blank" />
        </div>
      </dl>
      <span className="p11-r6-track" />
      <span className="p11-r6-note">Not started yet</span>
    </Paper>
  </Frame>
);

/** B: an example goal as a card, with the monthly saving slip behind it. */
export const GoalsB: Pic = ({ decorative }) => (
  <Frame
    decorative={decorative}
    h={15.5}
    label={`An example savings goal card: ${formatGbp(GOAL_TARGET)} by ${GOAL_BY}, nothing saved yet, from ${formatGbp(cashSaving)} a month.`}
    scene="goals-b"
  >
    <BankCard
      figure={formatGbp(GOAL_TARGET)}
      mark="none"
      meta={`By ${GOAL_BY}`}
      name="Savings goal"
      style={at(0.4, 0.8, undefined, -3)}
      tone="goal"
    >
      <span className="p11-r6-cardtrack" />
    </BankCard>
    <Paper className="p11-r6-slip" style={at(12.4, 8, 9.2, 4)} title="Each month">
      <span className="p11-r6-big tabular-nums">{formatGbp(cashSaving)}</span>
      <span className="p11-r6-note">From your budget</span>
    </Paper>
  </Frame>
);

/* =============================================================================================
 * empty-savings
 * =========================================================================================== */

/** A: the savings card, its last three months on a slip behind. */
export const SavingsA: Pic = ({ decorative }) => (
  <Frame
    decorative={decorative}
    h={16}
    label={`An example savings card, ${FIG.savings} at ${FIG.savingsRate}, with a slip of the last three months: ${lastThree.map((p) => `${formatGbp(p.value)} in ${p.long}`).join(", ")}.`}
    scene="savings-a"
  >
    <BankCard
      figure={FIG.savings}
      meta={FIG.savingsRate}
      name="Cash and savings"
      style={at(0.4, 0.8, undefined, -4)}
      tone="savings"
    />
    <Paper className="p11-r6-receipt" example style={at(10.4, 4, 11.2, 3)} title="Balances">
      <dl className="p11-rows tabular-nums">
        {lastThree.map((p) => (
          <div key={p.long}>
            <dt>{p.label}</dt>
            <dd>{formatGbp(p.value)}</dd>
          </div>
        ))}
      </dl>
    </Paper>
  </Frame>
);

/** B: one savings pot document with its year drawn as a line. */
export const SavingsB: Pic = ({ decorative }) => (
  <Frame
    decorative={decorative}
    h={15}
    label={`An example savings document: cash and savings ${FIG.savings}, ${FIG.savingsRate}, ${formatGbp(cashSaving)} added each month, with a line of the last 12 months.`}
    scene="savings-b"
  >
    <Paper className="p11-r6-pot" example style={at(2.4, 0.8, 17.2, -2)} title="Cash and savings">
      <span className="p11-r6-big tabular-nums">{FIG.savings}</span>
      <Spark values={SAVINGS.points.map((p) => p.value)} />
      <dl className="p11-rows tabular-nums">
        <div>
          <dt>Interest</dt>
          <dd>{FIG.savingsRate}</dd>
        </div>
        <div className="p11-r6-lastrow">
          <dt>Added each month</dt>
          <dd>{formatGbp(cashSaving)}</dd>
        </div>
      </dl>
    </Paper>
  </Frame>
);

/* =============================================================================================
 * empty-debt
 * =========================================================================================== */

/** "Nov 2026" from "November 2026". */
const short = (long: string) => long.replace(/^(\w{3})\w*/, "$1");
const DEBT_ROWS = [
  { when: DEBT.startLabel, value: formatGbp(DEBT.start) },
  ...(midDebt
    ? [{ when: midDebt.long, value: formatGbp(Math.round(midDebt.value / 100) * 100) }]
    : []),
];
const debtLabel = `Example card and loan payoff: ${DEBT_ROWS.map((r) => `${r.value} in ${r.when}`).join(", ")}, clear in ${DEBT.endLabel}.`;

/** A: a payoff schedule slip in front of the credit card. */
export const DebtA: Pic = ({ decorative }) => (
  <Frame decorative={decorative} h={16} label={debtLabel} scene="debt-a">
    <BankCard
      figure={FIG.card}
      mark="wave"
      meta={FIG.cardRate}
      name="Credit card"
      style={at(0.4, 0.6, undefined, -4)}
      tone="credit"
    />
    <Paper className="p11-r6-receipt" example style={at(8.6, 3.6, 13, 3)} title="Paying off">
      <dl className="p11-rows tabular-nums">
        {DEBT_ROWS.map((r) => (
          <div key={r.when}>
            <dt>{short(r.when)}</dt>
            <dd>{r.value}</dd>
          </div>
        ))}
        <div className="p11-rows__total">
          <dt>{short(DEBT.endLabel)}</dt>
          <dd>{formatGbp(0)}</dd>
        </div>
      </dl>
    </Paper>
  </Frame>
);

/** B: a card and loan statement with a payoff date. */
export const DebtB: Pic = ({ decorative }) => (
  <Frame decorative={decorative} h={15} label={debtLabel} scene="debt-b">
    <Paper className="p11-r6-under" style={at(5.4, 1.4, 15, 4)} />
    <div className="p11-paper p11-statement p11-r6-statement" style={at(2.6, 0.8, 16, -2)}>
      <div className="p11-statement__letterhead">
        <span className="p11-statement__mark" />
        <span className="p11-statement__lines">
          <i />
          <i />
        </span>
        <Example />
      </div>
      <span className="p11-paper__title">Card and loan</span>
      <dl className="p11-rows tabular-nums">
        <div className="p11-rows__total">
          <dt>Balance</dt>
          <dd>{formatGbp(DEBT.start)}</dd>
        </div>
        <div>
          <dt>Paying each month</dt>
          <dd>{formatGbp(DEBT.monthly)}</dd>
        </div>
        <div className="p11-r6-lastrow">
          <dt>Clear by</dt>
          <dd>{DEBT.endLabel}</dd>
        </div>
      </dl>
      <span className="p11-paper__sheen" />
    </div>
  </Frame>
);

/* =============================================================================================
 * empty-pension
 * =========================================================================================== */

/** A: a pension statement. */
export const PensionA: Pic = ({ decorative }) => (
  <Frame
    decorative={decorative}
    h={15}
    label={`An example pension statement: pot value ${FIG.pension}, you pay ${PAYSLIP.rows.find((r) => r.id === "pension")?.label.replace(/^Pension \(|\)$/g, "")} of salary, ${pensionMonthly ? formatGbpPence(pensionMonthly.amount) : ""} a month.`}
    scene="pension-a"
  >
    <Paper className="p11-r6-under" style={at(5, 1.6, 15, 4)} />
    <div className="p11-paper p11-statement p11-r6-statement" style={at(2.6, 0.8, 16, -2)}>
      <div className="p11-statement__letterhead">
        <span className="p11-statement__mark" />
        <span className="p11-statement__lines">
          <i />
          <i />
        </span>
        <Example />
      </div>
      <span className="p11-paper__title">Pension statement</span>
      <dl className="p11-rows tabular-nums">
        <div className="p11-rows__total">
          <dt>Pot value</dt>
          <dd>{FIG.pension}</dd>
        </div>
        <div>
          <dt>You pay in</dt>
          <dd>
            {PAYSLIP.rows.find((r) => r.id === "pension")?.label.replace(/^Pension \(|\)$/g, "")} of
            salary
          </dd>
        </div>
        <div className="p11-r6-lastrow">
          <dt>Each month</dt>
          <dd>{pensionMonthly ? formatGbpPence(pensionMonthly.amount) : ""}</dd>
        </div>
      </dl>
      <span className="p11-paper__sheen" />
    </div>
  </Frame>
);

/** B: a pension card with a dashed place for another pot. */
export const PensionB: Pic = ({ decorative }) => (
  <Frame
    decorative={decorative}
    h={17}
    label={`An example pension card, ${FIG.pension}, with a dashed space to add another pension pot.`}
    scene="pension-b"
  >
    <Slot style={at(8.6, 0.2, 12.6)}>Add a pension pot</Slot>
    <BankCard
      figure={FIG.pension}
      mark="none"
      meta="Workplace and personal"
      name="Pension"
      style={at(0.6, 4.8, undefined, -3)}
      tone="pension"
    />
  </Frame>
);

/* =============================================================================================
 * check-in and check-in-done
 * =========================================================================================== */

const CHECK_ROWS = [
  { label: "Cash and savings", value: FIG.savings },
  { label: "Pension", value: FIG.pension },
  { label: "Credit card", value: FIG.card },
];

/** A: a check-in slip with three balances, ticked when done. */
const CheckSlip: FC<{ done?: boolean; decorative?: boolean }> = ({ done, decorative }) => (
  <Frame
    decorative={decorative}
    h={14}
    label={
      done
        ? `Example November check-in, done: ${CHECK_ROWS.map((r) => `${r.label} ${r.value}`).join(", ")}, updated 26 November.`
        : `Example November check-in with three balances to update: ${CHECK_ROWS.map((r) => `${r.label} ${r.value}`).join(", ")}.`
    }
    scene={done ? "checkdone-a" : "check-a"}
  >
    <Paper className="p11-r6-under" style={at(5.4, 1.2, 14, 4)} />
    <Paper className="p11-r6-check" example style={at(2.2, 0.6, 17.4, -2)} title="Monthly check-in">
      <dl className="p11-rows tabular-nums">
        {CHECK_ROWS.map((r) => (
          <div key={r.label}>
            <dt>
              {done && <Tick />}
              {r.label}
            </dt>
            <dd>{r.value}</dd>
          </div>
        ))}
      </dl>
      {done ? (
        <span className="p11-r6-note">Updated 26 November</span>
      ) : (
        <span className="p11-r6-note">Three balances to update</span>
      )}
    </Paper>
  </Frame>
);

/** B: a tear-off calendar page, with a tag. */
const CheckPage: FC<{ done?: boolean; decorative?: boolean }> = ({ done, decorative }) => (
  <Frame
    decorative={decorative}
    h={14}
    label={
      done
        ? "A calendar page for 26 November, tagged checked in."
        : "A calendar page for 26 November, tagged check-in day."
    }
    scene={done ? "checkdone-b" : "check-b"}
  >
    <Paper className="p11-r6-under" style={at(7.6, 1.2, 10.4, 5)} />
    <div className="p11-paper p11-r6-page" style={at(5.6, 0.8, 10.4, -3)}>
      <span className="p11-r6-page__band">November</span>
      <span className="p11-r6-page__day tabular-nums">26</span>
      <span className="p11-r6-note">Thursday</span>
      <span className="p11-paper__sheen" />
    </div>
    <span className="p11-r6-tag" style={at(12.6, 9.2, undefined, 6)}>
      {done && <Tick />}
      {done ? "Checked in" : "Check-in day"}
    </span>
  </Frame>
);

export const CheckInA: Pic = ({ decorative }) => <CheckSlip decorative={decorative} />;
export const CheckInB: Pic = ({ decorative }) => <CheckPage decorative={decorative} />;
export const CheckInDoneA: Pic = ({ decorative }) => <CheckSlip decorative={decorative} done />;
export const CheckInDoneB: Pic = ({ decorative }) => <CheckPage decorative={decorative} done />;

/* =============================================================================================
 * onboarding
 * =========================================================================================== */

const ON_STEPS = [
  { label: "Rough figures", detail: `${FIG.comesIn} in` },
  { label: "Your picture", detail: `${FIG.netWorth} net worth` },
  { label: "Check in", detail: "Once a month" },
];
const onboardingLabel = `Three steps: rough figures (example ${FIG.comesIn} a month in), your picture (example ${FIG.netWorth} net worth), check in once a month.`;

/** A: three numbered cards, each a little higher, fanned. */
export const OnboardingA: Pic = ({ decorative }) => (
  <Frame decorative={decorative} h={15} label={onboardingLabel} scene="onboarding-a">
    {ON_STEPS.map((step, i) => (
      <Paper
        className="p11-r6-stepcard"
        key={step.label}
        style={at(0.2 + i * 6.9, 6.4 - i * 2.8, 7.8, -4 + i * 4)}
      >
        <span className="p11-r6-stepnum tabular-nums">{i + 1}</span>
        <span className="p11-r6-steplabel">{step.label}</span>
        <span className="p11-r6-note tabular-nums">{step.detail}</span>
      </Paper>
    ))}
    <span className="p11-r6-expos" style={at(0.6, 1.2)}>
      <Example />
    </span>
  </Frame>
);

/** B: one ticket in three perforated parts. */
export const OnboardingB: Pic = ({ decorative }) => (
  <Frame decorative={decorative} h={14} label={onboardingLabel} scene="onboarding-b">
    <div className="p11-paper p11-r6-ticket" style={at(0.6, 1.6, 20.8, -2)}>
      <div className="p11-paper__head">
        <span className="p11-paper__title">Getting started</span>
        <Example />
      </div>
      <ol className="p11-r6-ticket__parts">
        {ON_STEPS.map((step, i) => (
          <li key={step.label}>
            <span className="p11-r6-stepnum tabular-nums">{i + 1}</span>
            <span className="p11-r6-steplabel">{step.label}</span>
            <span className="p11-r6-note tabular-nums">{step.detail}</span>
          </li>
        ))}
      </ol>
      <span className="p11-paper__sheen" />
    </div>
  </Frame>
);

/* =============================================================================================
 * not-found
 * =========================================================================================== */

const notFoundLabel = "A page with two ways on: to the home page and to Flump features.";

/** A: a torn blank slip, nothing written on it. */
export const NotFoundA: Pic = ({ decorative }) => (
  <Frame
    decorative={decorative}
    h={14}
    label="A torn blank slip with nothing on it."
    scene="notfound-a"
  >
    <Paper className="p11-r6-under" style={at(7.4, 1.2, 11, 5)} />
    <div className="p11-paper p11-r6-torn" style={at(5.4, 0.6, 11.4, -3)}>
      <span className="p11-paper__title">Nothing here</span>
      <span className="p11-r6-lines">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="p11-paper__sheen" />
    </div>
  </Frame>
);

/** B: a card with two direction tabs. */
export const NotFoundB: Pic = ({ decorative }) => (
  <Frame decorative={decorative} h={13} label={notFoundLabel} scene="notfound-b">
    <Paper className="p11-r6-where" style={at(4.6, 0.6, 12.8, -2)} title="Where next?">
      <span className="p11-r6-lines">
        <i />
        <i />
      </span>
    </Paper>
    <span className="p11-r6-dirtab p11-r6-dirtab--left" style={at(0.6, 8.4, undefined, -4)}>
      <ArrowLeft aria-hidden="true" />
      Flump features
    </span>
    <span className="p11-r6-dirtab p11-r6-dirtab--right" style={at(12.8, 7.6, undefined, 4)}>
      Home page
      <ArrowRight aria-hidden="true" />
    </span>
  </Frame>
);

/* =============================================================================================
 * Features tile: Savings and pension, four options.
 * =========================================================================================== */

const tileLabel = `Example savings ${FIG.savings} and pension ${FIG.pension}.`;

/** 1: the savings card beside a pension statement. */
export const TileSavingsPensionA: FC = () => (
  <Frame decorative h={14} label={tileLabel} scene="tile-a">
    <BankCard
      figure={FIG.savings}
      meta={FIG.savingsRate}
      name="Cash and savings"
      style={at(0.4, 0.6, undefined, -4)}
      tone="savings"
    />
    <div className="p11-paper p11-statement p11-r6-tilestatement" style={at(9.8, 4.6, 11.8, 3)}>
      <div className="p11-statement__letterhead">
        <span className="p11-statement__mark" />
        <span className="p11-paper__title">Pension</span>
      </div>
      <dl className="p11-rows tabular-nums">
        <div className="p11-rows__total">
          <dt>Pot value</dt>
          <dd>{FIG.pension}</dd>
        </div>
      </dl>
      <span className="p11-r6-note">Workplace and personal</span>
      <span className="p11-paper__sheen" />
    </div>
  </Frame>
);

/** 2: one statement slip with two lines and the two together. */
export const TileSavingsPensionB: FC = () => (
  <Frame decorative h={14} label={tileLabel} scene="tile-b">
    <Paper className="p11-r6-under" style={at(4.4, 1.4, 15, 4)} />
    <Paper className="p11-r6-two" example style={at(0.8, 1, 20.2, -2)} title="Savings and pension">
      <dl className="p11-rows tabular-nums">
        <div>
          <dt>Cash and savings</dt>
          <dd>{FIG.savings}</dd>
        </div>
        <div>
          <dt>Pension</dt>
          <dd>{FIG.pension}</dd>
        </div>
        <div className="p11-rows__total">
          <dt>Together</dt>
          <dd>{formatGbp(together)}</dd>
        </div>
      </dl>
    </Paper>
  </Frame>
);

/** 3: a passbook, open on two pages. */
export const TileSavingsPensionC: FC = () => (
  <Frame decorative h={14} label={tileLabel} scene="tile-c">
    <div className="p11-r6-book" style={at(1, 1.4, 20, -2)}>
      <span className="p11-r6-book__cover" />
      <div className="p11-paper p11-r6-book__page">
        <span className="p11-r6-note">Savings</span>
        <span className="p11-r6-big tabular-nums">{FIG.savings}</span>
        <span className="p11-r6-note tabular-nums">{FIG.savingsRate}</span>
        <span className="p11-paper__sheen" />
      </div>
      <div className="p11-paper p11-r6-book__page p11-r6-book__page--right">
        <span className="p11-r6-note">Pension</span>
        <span className="p11-r6-big tabular-nums">{FIG.pension}</span>
        <Example />
        <span className="p11-paper__sheen" />
      </div>
    </div>
  </Frame>
);

/** 4: a stacked pair of cards with a small tag showing a year of savings. */
export const TileSavingsPensionD: FC = () => (
  <Frame decorative h={15} label={tileLabel} scene="tile-d">
    <BankCard
      figure={FIG.pension}
      mark="none"
      meta="Workplace and personal"
      name="Pension"
      style={at(4.6, 0.4, undefined, 4)}
      tone="pension"
    />
    <BankCard
      figure={FIG.savings}
      meta={FIG.savingsRate}
      name="Cash and savings"
      style={at(0.4, 4.4, undefined, -3)}
      tone="savings"
    />
    <Paper className="p11-r6-sparktag" style={at(14.2, 9.6, 7.6, 3)}>
      <span className="p11-r6-note">Last 12 months</span>
      <Spark values={SAVINGS.points.map((p) => p.value)} />
    </Paper>
  </Frame>
);

/* =============================================================================================
 * The options for the image sheet.
 * =========================================================================================== */

export const ROUND6_OPTIONS: Record<string, readonly Pic[]> = {
  "empty-goals": [GoalsA, GoalsB],
  "empty-savings": [SavingsA, SavingsB],
  "empty-debt": [DebtA, DebtB],
  "empty-pension": [PensionA, PensionB],
  "check-in": [CheckInA, CheckInB],
  "check-in-done": [CheckInDoneA, CheckInDoneB],
  onboarding: [OnboardingA, OnboardingB],
  "not-found": [NotFoundA, NotFoundB],
};

export const SAVINGS_PENSION_TILE_OPTIONS: readonly Pic[] = [
  TileSavingsPensionA,
  TileSavingsPensionB,
  TileSavingsPensionC,
  TileSavingsPensionD,
];
