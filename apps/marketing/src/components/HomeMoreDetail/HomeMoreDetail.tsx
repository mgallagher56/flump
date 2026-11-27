import { Card, marketingMs } from "@repo/ui";
import { type FC, useRef } from "react";
import { Link } from "react-router-dom";
import type { GsapKit } from "../../motion/loadGsapKit";
import { useGsapMoment } from "../../motion/useGsapMoment";
import { MONEY_AREAS, type MoneyAreaKey } from "../../utils/featureAreas";
import { MarketingBand } from "../MarketingBand";
import { TiltLight } from "../TiltLight";
import { detailItem, detailLink, detailList, detailText } from "./HomeMoreDetail.styles";

/** "More detail when you want it": one deeper tool from four areas, each linked to its page. */
export const HOME_DEPTH: readonly { area: MoneyAreaKey; text: string }[] = [
  {
    area: "pay",
    text: "Self Assessment: income and costs for each tax year, with an estimate of your tax bill",
  },
  {
    area: "savings-and-pension",
    text: "A retirement plan: an estimate of your yearly income against a target you set",
  },
  {
    area: "debt-and-borrowing",
    text: "Overpay or save, compared, and an estimate of your payment when a fixed rate ends",
  },
  {
    area: "accounts",
    text: "Your share of a joint account, and a choice of what counts towards net worth",
  },
];

const areaFor = (key: MoneyAreaKey) => MONEY_AREAS.find((area) => area.key === key);

/**
 * The items deal in, in document order: a small rise and a fade, staggered, played once when the
 * list nears the viewport and finished by time, never tied to scroll (MK2). Transforms are cleared
 * afterwards, so nothing rests half dealt or overlapping.
 */
export function moreDetailMoment({ gsap }: GsapKit, root: HTMLElement): undefined {
  const items = Array.from(root.querySelectorAll("[data-deal-item]"));
  if (items.length === 0) return;
  gsap.from(items, {
    y: 12,
    opacity: 0,
    duration: marketingMs("entry") / 1000,
    stagger: marketingMs("stagger") / 1000,
    ease: "calm",
    clearProps: "transform,opacity",
    scrollTrigger: { trigger: root, start: "top 90%", once: true },
  });
}

/**
 * "More detail when you want it" (ROLLOUT-PLAN M1, from prototype 11): beside the questions from
 * 75rem (`pairBands` on the home page), the four deeper tools dealt in, in order, each a sheet with
 * the tilt-and-light hover.
 */
export const HomeMoreDetail: FC = () => {
  const listRef = useRef<HTMLUListElement>(null);
  useGsapMoment(listRef, moreDetailMoment);

  return (
    <MarketingBand
      bubbleFit="beside"
      bubbles="b"
      id="more-detail"
      stop="More detail"
      subtitle="Each area starts simple and has more underneath for when you want it."
      title="More detail when you want it"
      tone="card"
    >
      <ul className={detailList} ref={listRef}>
        {HOME_DEPTH.map((item) => {
          const area = areaFor(item.area);
          return (
            <TiltLight as="li" data-deal-item="" key={item.area}>
              <Card className={detailItem} padding="none">
                <span className={detailText}>{item.text}</span>
                {area && (
                  <Link className={detailLink} to={area.path}>
                    About {area.name.toLowerCase()} in Flump
                  </Link>
                )}
              </Card>
            </TiltLight>
          );
        })}
      </ul>
    </MarketingBand>
  );
};
