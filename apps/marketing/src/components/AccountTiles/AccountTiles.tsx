import { ExampleTag } from "@repo/ui";
import type { FC } from "react";
import { BubbleField } from "../BubbleField";
import { CountUpFigure } from "../CountUpFigure";
import { formatGbp } from "../CountUpFigure/figureFormats";
import * as s from "./AccountTiles.styles";

export interface AccountTile {
  readonly id: string;
  readonly name: string;
  readonly amount: number;
  /** True for what you owe. */
  readonly owed: boolean;
}

export interface AccountTilesProps {
  tiles: readonly AccountTile[];
  /** Net worth: what you have minus what you owe. */
  netWorth: number;
}

/**
 * The accounts tiles, one of the two approved set pieces (STYLE-GUIDE 11.2), from prototype 11's
 * `AccountsVisual`: six sample accounts as small glass cards, each marked "You have" or "You owe",
 * and the net worth they add up to, tagged "Example". It renders laid out (MK1); `dealInMoment`
 * deals the cards from one pile to their places once, while the net worth counts through the
 * running total (MK13).
 */
export const AccountTiles: FC<AccountTilesProps> = ({ tiles, netWorth }) => (
  <div className={s.wrap} data-account-tiles="">
    <BubbleField fit="sample" layout="a" />
    <div className={s.body}>
      <ul aria-label="Example accounts" className={s.deck} data-deck="">
        {tiles.map((tile) => (
          <li
            className={s.deal}
            data-deal=""
            data-signed={tile.owed ? -tile.amount : tile.amount}
            key={tile.id}
          >
            <div className={s.card}>
              <span className={s.cardName}>{tile.name}</span>
              <span className={s.cardAmount}>{formatGbp(tile.amount)}</span>
              <span className={s.cardKind}>{tile.owed ? "You owe" : "You have"}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className={s.total}>
        <p className={s.totalLabel}>
          Net worth <ExampleTag variant="paper" />
        </p>
        <p className={s.totalFigure}>
          <CountUpFigure data-testid="account-tiles-net-worth" format="gbp100" value={netWorth} />
        </p>
        <p className={s.caption}>What you have minus what you owe.</p>
      </div>
    </div>
  </div>
);
