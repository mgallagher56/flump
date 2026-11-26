import type { CSSProperties, FC } from "react";
import type { GsapKit } from "../shared/gsapKit";
import { formatGbp } from "../shared/sampleData";
import { ACCOUNT_CARDS, NET_WORTH, RUNNING_TOTALS } from "./data";
import { Scene, Sr } from "./Scene";

/**
 * Scrubbed: the six cards start as one squared-up pile in the middle of the stage and are dealt to
 * their places in turn. The total under them follows each card as it lands (debts take it down),
 * settling on the net worth when the last card is down.
 */
const setup = ({ gsap }: GsapKit, root: HTMLElement) => {
  const deck = root.querySelector<HTMLElement>(".p5-cards");
  const total = root.querySelector<HTMLElement>("[data-p5-total]");
  if (!deck || !total) return;
  const cards = gsap.utils.toArray<HTMLElement>(".p5-card", deck);
  const toCentre = (card: HTMLElement) => ({
    x: deck.clientWidth / 2 - (card.offsetLeft + card.offsetWidth / 2),
    y: deck.clientHeight / 2 - (card.offsetTop + card.offsetHeight / 2),
  });
  const proxy = { v: 0 };
  const write = () => {
    total.textContent = formatGbp(Math.round(proxy.v / 100) * 100);
  };
  const step = 0.5;
  const tl = gsap.timeline({
    defaults: { ease: "flump" },
    onUpdate: write,
    scrollTrigger: {
      trigger: deck,
      start: "top 82%",
      end: "bottom 45%",
      scrub: 0.7,
      invalidateOnRefresh: true,
    },
  });
  cards.forEach((card, i) => {
    tl.from(
      card,
      {
        x: () => toCentre(card).x,
        y: () => toCentre(card).y + i * -3,
        rotation: (i - 2.5) * 2.4,
        scale: 0.9,
        duration: 1,
      },
      i * step,
    );
    tl.to(proxy, { v: RUNNING_TOTALS[i] ?? 0, duration: 0.9 }, i * step + 0.1);
  });
  tl.from(".p5-total__caption", { opacity: 0, y: 8, duration: 0.6 }, ">-0.3");
  write();
};

export const AccountsScene: FC = () => (
  <Scene
    areaKey="accounts"
    layout="left"
    note="In this example: six accounts, from a cash savings account to a personal loan."
    setup={setup}
  >
    <div className="p5-accounts">
      <ul aria-label="Example accounts" className="p5-cards">
        {ACCOUNT_CARDS.map((card, i) => (
          <li
            className="p5-card"
            data-owed={card.sign < 0}
            key={card.id}
            style={{ "--p5-z": ACCOUNT_CARDS.length - i } as CSSProperties}
          >
            <span className="p5-card__name">{card.name}</span>
            <span className="p5-card__amount tabular-nums">{formatGbp(card.amount)}</span>
            <span className="p5-card__kind">{card.sign < 0 ? "You owe" : "You have"}</span>
          </li>
        ))}
      </ul>
      <div className="p5-total">
        <p className="p5-total__label">Net worth</p>
        <p className="p5-total__figure tabular-nums">
          <Sr>{formatGbp(NET_WORTH)}</Sr>
          <span aria-hidden="true" data-p5-total="">
            {formatGbp(NET_WORTH)}
          </span>
        </p>
        <p className="p5-total__caption">What you have minus what you owe. Example figures.</p>
      </div>
    </div>
  </Scene>
);
