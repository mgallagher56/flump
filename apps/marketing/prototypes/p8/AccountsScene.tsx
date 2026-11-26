import type { CSSProperties, FC } from "react";
import { formatGbp } from "../shared/sampleData";
import { scrubFor } from "./calm";
import { Scene, type SceneSetup, Sr } from "./Scene";
import { ACCOUNT_CARDS, NET_WORTH, RUNNING_TOTALS } from "./sceneData";

/**
 * Scrubbed (prototype 5, slowed): the six cards start as one squared-up pile in the middle of the
 * stage and are dealt to their places in turn. The total under them counts with each card as it
 * lands (debts take it down), settling on the net worth when the last card is down. The dealt
 * element is the list item; the card face inside it carries the pointer tilt, so the two never
 * fight over one transform.
 */
const setup: SceneSetup = ({ gsap }, root, pace) => {
  const deck = root.querySelector<HTMLElement>(".p8-s-cards");
  const total = root.querySelector<HTMLElement>("[data-p8-s-total]");
  if (!deck || !total) return;
  const cards = gsap.utils.toArray<HTMLElement>(".p8-s-deal", deck);
  const toCentre = (card: HTMLElement) => ({
    x: deck.clientWidth / 2 - (card.offsetLeft + card.offsetWidth / 2),
    y: deck.clientHeight / 2 - (card.offsetTop + card.offsetHeight / 2),
  });
  const proxy = { v: 0 };
  const write = () => {
    total.textContent = formatGbp(Math.round(proxy.v / 100) * 100);
  };
  const step = 0.7;
  const tl = gsap.timeline({
    defaults: { ease: "calmInOut" },
    onUpdate: write,
    scrollTrigger: scrubFor(deck, pace, 1.4, "top 92%"),
  });
  cards.forEach((card, i) => {
    tl.from(
      card,
      {
        x: () => toCentre(card).x,
        y: () => toCentre(card).y + i * -3,
        rotation: (i - 2.5) * 1.6,
        scale: 0.96,
        duration: 1.3,
      },
      i * step,
    );
    tl.to(proxy, { v: RUNNING_TOTALS[i] ?? 0, duration: 1.2, ease: "calm" }, i * step + 0.15);
  });
  tl.from(".p8-s-total__caption", { opacity: 0, y: 10, duration: 0.8, ease: "calm" }, ">-0.4");
  write();
};

export const AccountsScene: FC = () => (
  <Scene
    areaKey="accounts"
    bubbles="a"
    tone="card"
    layout="left"
    note="In this example: six accounts, from a cash savings account to a personal loan."
    setup={setup}
  >
    <div className="p8-s-accounts">
      <ul aria-label="Example accounts" className="p8-s-cards">
        {ACCOUNT_CARDS.map((card, i) => (
          <li
            className="p8-s-deal"
            key={card.id}
            style={{ "--p8-s-z": ACCOUNT_CARDS.length - i } as CSSProperties}
          >
            <div className="p8-s-card" data-tilt="">
              <span className="p8-s-card__name">{card.name}</span>
              <span className="p8-s-card__amount tabular-nums">{formatGbp(card.amount)}</span>
              <span className="p8-s-card__kind">{card.sign < 0 ? "You owe" : "You have"}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="p8-s-total">
        <p className="p8-s-total__label">Net worth</p>
        <p className="p8-s-total__figure tabular-nums">
          <Sr>{formatGbp(NET_WORTH)}</Sr>
          <span aria-hidden="true" data-p8-s-total="">
            {formatGbp(NET_WORTH)}
          </span>
        </p>
        <p className="p8-s-total__caption">What you have minus what you owe. Example figures.</p>
      </div>
    </div>
  </Scene>
);
