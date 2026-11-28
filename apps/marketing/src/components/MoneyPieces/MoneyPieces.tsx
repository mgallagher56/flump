import { ExampleTag } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { HERO_FIGURES as FIG, type PieceKey } from "../HomeHero/heroData";
import {
  card,
  cardChip,
  cardEdge,
  cardFace,
  cardFigure,
  cardMeta,
  cardName,
  cardSheen,
  cardTag,
  cardTone,
  cardTop,
  cardWave,
  letterhead,
  letterheadLines,
  letterheadMark,
  paper,
  paperHead,
  paperTitle,
  pieceRows,
  pieceRowTotal,
} from "./MoneyPieces.styles";

/*
 * The six pieces of the household's money, as document cards built from tokens (F3 has no such
 * pictures): a savings card, a payslip, a till receipt, a mortgage statement, a pension statement
 * and a credit card. Each carries a real-text "Example" tag. They are decorative copies of the
 * hero's "Made from" rows, so every caller puts them inside an aria-hidden layer.
 */

const CardPiece: FC<{
  tone: "savings" | "credit";
  name: string;
  figure: string;
  meta: string;
}> = ({ tone, name, figure, meta }) => (
  <div className={cx(card, cardTone({ tone }))}>
    <div className={cardEdge} />
    <div className={cardFace}>
      <div className={cardTop}>
        <span className={cardName}>{name}</span>
        <span className={cardTag}>Example</span>
      </div>
      <span className={tone === "savings" ? cardChip : cardWave} />
      <span className={cardFigure}>{figure}</span>
      <span className={cardMeta}>{meta}</span>
      <span className={cardSheen} />
    </div>
  </div>
);

type Row = readonly [label: string, figure: string];

const PieceRows: FC<{ rows: readonly Row[]; total: number; from?: "left" }> = ({
  rows,
  total,
  from,
}) => (
  <dl className={pieceRows}>
    {rows.map(([label, figure], index) => (
      <div className={index === total ? pieceRowTotal : undefined} key={label}>
        <dt>{label}</dt>
        {/* The receipt's total is where the hero's "left over" figure lifts off (`data-hero-from`). */}
        <dd data-hero-from={index === total ? from : undefined}>{figure}</dd>
      </div>
    ))}
  </dl>
);

const PaperPiece: FC<{ kind: "payslip" | "receipt"; title: string; rows: readonly Row[] }> = ({
  kind,
  title,
  rows,
}) => (
  <div className={paper({ kind })}>
    <div className={paperHead}>
      <span className={paperTitle}>{title}</span>
      <ExampleTag />
    </div>
    <PieceRows from={kind === "receipt" ? "left" : undefined} rows={rows} total={rows.length - 1} />
  </div>
);

const StatementPiece: FC<{ title: string; rows: readonly Row[] }> = ({ title, rows }) => (
  <div className={paper({ kind: "statement" })}>
    <div className={letterhead}>
      <span className={letterheadMark} />
      <span className={letterheadLines}>
        <i />
        <i />
      </span>
      <ExampleTag />
    </div>
    <span className={paperTitle}>{title}</span>
    <PieceRows rows={rows} total={0} />
  </div>
);

const PIECES: Record<PieceKey, FC> = {
  card: () => (
    <CardPiece figure={FIG.savings} meta={FIG.savingsRate} name="Cash and savings" tone="savings" />
  ),
  payslip: () => (
    <PaperPiece
      kind="payslip"
      rows={[
        ["Salary a year", FIG.salary],
        ["Gross this month", FIG.grossMonthly],
        ["Net pay", FIG.netMonthly],
      ]}
      title="Payslip"
    />
  ),
  receipt: () => (
    <PaperPiece
      kind="receipt"
      rows={[
        ["Comes in", FIG.comesIn],
        ["Goes out", FIG.goesOut],
        ["Left over", FIG.leftOver],
      ]}
      title="This month"
    />
  ),
  statement: () => (
    <StatementPiece
      rows={[
        ["Balance", FIG.mortgage],
        ["Rate", FIG.mortgageRate],
        ["Fixed until", FIG.fixedUntil],
      ]}
      title="Mortgage statement"
    />
  ),
  pension: () => (
    <StatementPiece
      rows={[
        ["Pot value", FIG.pension],
        ["Kind", "Workplace and personal"],
      ]}
      title="Pension statement"
    />
  ),
  credit: () => (
    <CardPiece
      figure={FIG.card}
      meta={`${FIG.cardRate}, ${FIG.cardMonthly} a month`}
      name="Credit card"
      tone="credit"
    />
  ),
};

/** One of the six pieces, drawn at its full size; the caller places, scales and hides it. */
export const MoneyPiece: FC<{ k: PieceKey }> = ({ k }) => {
  const Body = PIECES[k];
  return <Body />;
};
