import type { FC } from "react";
import { FIG, type PieceKey } from "./pieceData";

/*
 * The six pieces of the household's money, drawn as small physical objects in DOM and CSS so the
 * text stays crisp: a savings card, a payslip, a till receipt for the budget, a mortgage
 * statement, a pension jar and a credit card. Decorative duplicates of the dashboard's "made
 * from" rows, so every piece is aria-hidden by its container. Sizes are in em, so one font size
 * on the container scales a whole piece for a phone.
 */

const Example: FC<{ tone?: "paper" | "dark" }> = ({ tone = "paper" }) => (
  <span className={`p8-ex p8-ex--${tone}`}>Example</span>
);

const SavingsCard: FC = () => (
  <div className="p8-card p8-card--savings">
    <div className="p8-card__edge" />
    <div className="p8-card__face">
      <div className="p8-card__top">
        <span className="p8-card__bank">Cash and savings</span>
        <Example tone="dark" />
      </div>
      <span className="p8-card__chip" />
      <span className="p8-card__figure tabular-nums">{FIG.savings}</span>
      <span className="p8-card__meta tabular-nums">{FIG.savingsRate}</span>
      <span className="p8-card__sheen" />
    </div>
  </div>
);

const CreditCard: FC = () => (
  <div className="p8-card p8-card--credit">
    <div className="p8-card__edge" />
    <div className="p8-card__face">
      <div className="p8-card__top">
        <span className="p8-card__bank">Credit card</span>
        <Example tone="dark" />
      </div>
      <span className="p8-card__wave" />
      <span className="p8-card__figure tabular-nums">{FIG.card}</span>
      <span className="p8-card__meta tabular-nums">
        {FIG.cardRate}, {FIG.cardMonthly} a month
      </span>
      <span className="p8-card__sheen" />
    </div>
  </div>
);

const Payslip: FC = () => (
  <div className="p8-paper p8-payslip">
    <div className="p8-paper__head">
      <span className="p8-paper__title">Payslip</span>
      <Example />
    </div>
    <dl className="p8-rows tabular-nums">
      <div>
        <dt>Salary a year</dt>
        <dd>{FIG.salary}</dd>
      </div>
      <div>
        <dt>Gross this month</dt>
        <dd>{FIG.grossMonthly}</dd>
      </div>
      <div className="p8-rows__total">
        <dt>Net pay</dt>
        <dd>{FIG.netMonthly}</dd>
      </div>
    </dl>
    <span className="p8-paper__sheen" />
  </div>
);

const Receipt: FC = () => (
  <div className="p8-paper p8-receipt">
    <div className="p8-paper__head">
      <span className="p8-paper__title">This month</span>
      <Example />
    </div>
    <dl className="p8-rows tabular-nums">
      <div>
        <dt>Comes in</dt>
        <dd>{FIG.comesIn}</dd>
      </div>
      <div>
        <dt>Goes out</dt>
        <dd>{FIG.goesOut}</dd>
      </div>
      <div className="p8-rows__total">
        <dt>Left over</dt>
        <dd data-p8-from="left">{FIG.leftOver}</dd>
      </div>
    </dl>
    <span className="p8-paper__sheen" />
  </div>
);

const Statement: FC = () => (
  <div className="p8-paper p8-statement">
    <div className="p8-statement__letterhead">
      <span className="p8-statement__mark" />
      <span className="p8-statement__lines">
        <i />
        <i />
      </span>
      <Example />
    </div>
    <span className="p8-paper__title">Mortgage statement</span>
    <dl className="p8-rows tabular-nums">
      <div className="p8-rows__total">
        <dt>Balance</dt>
        <dd>{FIG.mortgage}</dd>
      </div>
      <div>
        <dt>Rate</dt>
        <dd>{FIG.mortgageRate}</dd>
      </div>
      <div>
        <dt>Fixed until</dt>
        <dd>{FIG.fixedUntil}</dd>
      </div>
    </dl>
    <span className="p8-statement__fold" />
    <span className="p8-paper__sheen" />
  </div>
);

const PensionJar: FC = () => (
  <div className="p8-jar" style={{ "--p8-fill": `${FIG.pensionFill}%` } as React.CSSProperties}>
    <span className="p8-jar__lid" />
    <span className="p8-jar__glass">
      <span className="p8-jar__fill" />
      <span className="p8-jar__label">
        <span className="p8-jar__name">Pension</span>
        <span className="p8-jar__figure tabular-nums">{FIG.pension}</span>
        <Example />
      </span>
      <span className="p8-jar__glint" />
    </span>
  </div>
);

export const PIECES: Record<PieceKey, FC> = {
  card: SavingsCard,
  payslip: Payslip,
  receipt: Receipt,
  statement: Statement,
  pension: PensionJar,
  credit: CreditCard,
};

/** One piece, wrapped so the timeline can move the wrapper and light the face. */
export const Piece: FC<{ k: PieceKey; className?: string }> = ({ k, className = "" }) => {
  const Body = PIECES[k];
  return (
    <div className={`p8-piece p8-piece--${k} ${className}`} data-p8-piece={k}>
      <Body />
    </div>
  );
};
