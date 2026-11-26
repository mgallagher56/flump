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
  <span className={`p4-ex p4-ex--${tone}`}>Example</span>
);

const SavingsCard: FC = () => (
  <div className="p4-card p4-card--savings">
    <div className="p4-card__edge" />
    <div className="p4-card__face">
      <div className="p4-card__top">
        <span className="p4-card__bank">Cash and savings</span>
        <Example tone="dark" />
      </div>
      <span className="p4-card__chip" />
      <span className="p4-card__figure tabular-nums">{FIG.savings}</span>
      <span className="p4-card__meta tabular-nums">{FIG.savingsRate}</span>
      <span className="p4-card__sheen" />
    </div>
  </div>
);

const CreditCard: FC = () => (
  <div className="p4-card p4-card--credit">
    <div className="p4-card__edge" />
    <div className="p4-card__face">
      <div className="p4-card__top">
        <span className="p4-card__bank">Credit card</span>
        <Example tone="dark" />
      </div>
      <span className="p4-card__wave" />
      <span className="p4-card__figure tabular-nums">{FIG.card}</span>
      <span className="p4-card__meta tabular-nums">
        {FIG.cardRate}, {FIG.cardMonthly} a month
      </span>
      <span className="p4-card__sheen" />
    </div>
  </div>
);

const Payslip: FC = () => (
  <div className="p4-paper p4-payslip">
    <div className="p4-paper__head">
      <span className="p4-paper__title">Payslip</span>
      <Example />
    </div>
    <dl className="p4-rows tabular-nums">
      <div>
        <dt>Salary a year</dt>
        <dd>{FIG.salary}</dd>
      </div>
      <div>
        <dt>Gross this month</dt>
        <dd>{FIG.grossMonthly}</dd>
      </div>
      <div className="p4-rows__total">
        <dt>Net pay</dt>
        <dd>{FIG.netMonthly}</dd>
      </div>
    </dl>
    <span className="p4-paper__sheen" />
  </div>
);

const Receipt: FC = () => (
  <div className="p4-paper p4-receipt">
    <div className="p4-paper__head">
      <span className="p4-paper__title">This month</span>
      <Example />
    </div>
    <dl className="p4-rows tabular-nums">
      <div>
        <dt>Comes in</dt>
        <dd>{FIG.comesIn}</dd>
      </div>
      <div>
        <dt>Goes out</dt>
        <dd>{FIG.goesOut}</dd>
      </div>
      <div className="p4-rows__total">
        <dt>Left over</dt>
        <dd data-p4-from="left">{FIG.leftOver}</dd>
      </div>
    </dl>
    <span className="p4-paper__sheen" />
  </div>
);

const Statement: FC = () => (
  <div className="p4-paper p4-statement">
    <div className="p4-statement__letterhead">
      <span className="p4-statement__mark" />
      <span className="p4-statement__lines">
        <i />
        <i />
      </span>
      <Example />
    </div>
    <span className="p4-paper__title">Mortgage statement</span>
    <dl className="p4-rows tabular-nums">
      <div className="p4-rows__total">
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
    <span className="p4-statement__fold" />
    <span className="p4-paper__sheen" />
  </div>
);

const PensionJar: FC = () => (
  <div className="p4-jar" style={{ "--p4-fill": `${FIG.pensionFill}%` } as React.CSSProperties}>
    <span className="p4-jar__lid" />
    <span className="p4-jar__glass">
      <span className="p4-jar__fill" />
      <span className="p4-jar__label">
        <span className="p4-jar__name">Pension</span>
        <span className="p4-jar__figure tabular-nums">{FIG.pension}</span>
        <Example />
      </span>
      <span className="p4-jar__glint" />
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
    <div className={`p4-piece p4-piece--${k} ${className}`} data-p4-piece={k}>
      <Body />
    </div>
  );
};
