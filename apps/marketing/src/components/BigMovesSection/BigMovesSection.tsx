import { Card, SectionBand } from "@repo/ui";
import type { FC, ReactNode } from "react";
import { FiCreditCard, FiHome, FiSunrise } from "react-icons/fi";
import { Link } from "react-router-dom";
import {
  moveCard,
  moveIcon,
  moveSituation,
  moveSituationBody,
  moveSituationLabel,
  moveSituations,
  movesFooter,
  movesGrid,
  movesLink,
  moveTitle,
} from "./BigMovesSection.styles";

export interface BigMoveSituation {
  label: string;
  body: string;
}

export interface BigMove {
  id: string;
  title: string;
  icon: ReactNode;
  situations: BigMoveSituation[];
}

/**
 * The three big moves (E31). Each situation is described by what the person is doing, and renting
 * and paying a mortgage sit side by side with equal weight.
 */
export const BIG_MOVES: BigMove[] = [
  {
    id: "home",
    title: "Rent or mortgage",
    icon: <FiHome aria-hidden="true" size={20} />,
    situations: [
      {
        label: "Renting",
        body: "Your rent sits in your monthly picture, so you can see how a rent change or a move would affect safe to spend and months of cover.",
      },
      {
        label: "Paying a mortgage",
        body: "See what a new fixed rate or an overpayment would do to your monthly payment, before your current fix ends.",
      },
      {
        label: "Saving for a first home",
        body: "Track a deposit pot alongside your other savings and see how much you are putting aside each month.",
      },
    ],
  },
  {
    id: "debts",
    title: "Debts",
    icon: <FiCreditCard aria-hidden="true" size={20} />,
    situations: [
      {
        label: "Paying off a card or loan",
        body: "Compare paying the highest rate first with clearing the smallest balance first, and see an estimated date each would finish.",
      },
      {
        label: "Using a 0% deal or an overdraft",
        body: "See what a monthly payment would clear before a promotional rate ends, and what an overdraft costs over time.",
      },
    ],
  },
  {
    id: "pension",
    title: "Pension",
    icon: <FiSunrise aria-hidden="true" size={20} />,
    situations: [
      {
        label: "Checking a pension",
        body: "Add your pension balance and contribution to see an illustrative projection alongside the rest of your picture.",
      },
      {
        label: "Changing a contribution",
        body: "See how paying a different percentage, or using salary sacrifice, would change your take-home pay each month.",
      },
    ],
  },
];

export const BigMovesSection: FC = () => (
  <SectionBand
    id="big-moves"
    tone="canvas"
    indexBadge="Big moves"
    title="See what a change would do"
    subtitle="Try a change on your own rough figures under UK rules. These are illustrations to help you think it through, not advice."
  >
    <ul className={movesGrid()} aria-label="Big moves">
      {BIG_MOVES.map((move) => (
        <Card
          as="li"
          key={move.id}
          padding="lg"
          className={moveCard()}
          aria-labelledby={`move-${move.id}`}
        >
          <span className={moveIcon()}>{move.icon}</span>
          <h3 className={moveTitle()} id={`move-${move.id}`}>
            {move.title}
          </h3>
          <ul className={moveSituations()}>
            {move.situations.map((s) => (
              <li className={moveSituation()} key={s.label}>
                <span className={moveSituationLabel()}>{s.label}</span>
                <p className={moveSituationBody()}>{s.body}</p>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </ul>
    <p className={movesFooter()}>
      <span>Want to try one now, without signing in?</span>
      <Link to="/tools" className={movesLink()}>
        Browse free calculators
      </Link>
    </p>
  </SectionBand>
);

export default BigMovesSection;
