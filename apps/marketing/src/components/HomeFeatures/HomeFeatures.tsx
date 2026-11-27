import {
  Card,
  CarouselDots,
  CarouselStepButton,
  type DocumentScene,
  Illustration,
  marketingMs,
  usePrefersReducedMotion,
  useTiltLight,
} from "@repo/ui";
import { type FC, type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { GsapKit } from "../../motion/loadGsapKit";
import { useGsapMoment } from "../../motion/useGsapMoment";
import {
  AI_CONNECTION,
  AI_CONNECTION_ACCESS,
  FEATURES,
  FEATURES_INDEX,
  type Feature,
} from "../../utils/featureAreas";
import { BubbleField } from "../BubbleField";
import { MarketingSection } from "../MarketingSection";
import {
  bandFooter,
  bandLink,
  bubbleLayer,
  controls,
  featureCard,
  featureItem,
  featureLink,
  featureList,
  featureName,
  featureNote,
  featurePicture,
  featuresBand,
  featureText,
  strip,
} from "./HomeFeatures.styles";

type FeatureKey = Feature["key"];

/** Each tile's document picture (STYLE-GUIDE 8.3, the F3 feature pieces). */
export const FEATURE_PICTURES: Record<FeatureKey, DocumentScene> = {
  accounts: "feature-accounts",
  budget: "feature-budget",
  pay: "feature-pay",
  "savings-and-pension": "feature-savings-pension",
  "debt-and-borrowing": "feature-debt",
  "ai-connection": "feature-ai-connection",
};

export const FEATURES_LIST_ID = "home-features-list";
const LIST_LABEL = "Flump features";

/** Where the row is scrolled to: whether it overflows, and the first and last tiles fully in view. */
export interface CarouselPosition {
  overflow: boolean;
  first: number;
  last: number;
  atEnd: boolean;
}

/** A tile counts as in view when it is inside the row, give or take 8px of rounding. */
const EDGE_SLACK = 8;

/** Reads the row's position from layout. Pure apart from measuring, so it can be tested with stub boxes. */
export function measureCarousel(list: HTMLElement): CarouselPosition {
  const box = list.getBoundingClientRect();
  const shown = Array.from(list.children)
    .map((tile, index) => ({ rect: tile.getBoundingClientRect(), index }))
    .filter(
      ({ rect }) => rect.left >= box.left - EDGE_SLACK && rect.right <= box.right + EDGE_SLACK,
    )
    .map(({ index }) => index);
  const first = shown[0] ?? 0;
  return {
    overflow: list.scrollWidth > list.clientWidth + 4,
    first,
    last: shown[shown.length - 1] ?? first,
    atEnd: list.scrollLeft + list.clientWidth >= list.scrollWidth - 4,
  };
}

/**
 * The carousel's state, measured on scroll and resize. The server render (and a page without
 * script) has no overflow, so no controls: the row simply scrolls natively (MK1, MK9).
 */
function useCarousel(listRef: RefObject<HTMLUListElement | null>, count: number) {
  const reduced = usePrefersReducedMotion();
  const [position, setPosition] = useState<CarouselPosition>({
    overflow: false,
    first: 0,
    last: count - 1,
    atEnd: false,
  });

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      setPosition(measureCarousel(list));
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    list.addEventListener("scroll", queue, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(queue);
    observer?.observe(list);
    return () => {
      list.removeEventListener("scroll", queue);
      observer?.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [listRef]);

  const goTo = useCallback(
    (index: number) => {
      const list = listRef.current;
      const tile = list?.children[Math.max(0, Math.min(count - 1, index))];
      if (!list || !tile) return;
      const padding = Number.parseFloat(getComputedStyle(list).scrollPaddingLeft) || 0;
      const left =
        list.scrollLeft +
        tile.getBoundingClientRect().left -
        list.getBoundingClientRect().left -
        padding;
      list.scrollTo({ left, behavior: reduced ? "auto" : "smooth" });
    },
    [listRef, count, reduced],
  );

  // At the end of the row the last dot is current, since the last tile is the one just reached.
  const current = position.atEnd && position.overflow ? count - 1 : position.first;
  return { position, current, goTo };
}

/**
 * The tiles in view arrive in turn, once, by time (MK2): a short rise and a fade, staggered. Tiles
 * off to the side are already at rest, so none is caught half faded when scrolled to.
 */
export function featuresMoment({ gsap }: GsapKit, root: HTMLElement): undefined {
  const list = root.querySelector<HTMLElement>(`#${FEATURES_LIST_ID}`);
  if (!list) return;
  const edge = list.getBoundingClientRect().right;
  const inView = Array.from(list.children).filter(
    (tile) => tile.getBoundingClientRect().left < edge - 24,
  );
  if (inView.length === 0) return;
  gsap.from(inView, {
    y: 20,
    opacity: 0,
    duration: marketingMs("entry") / 1000,
    stagger: marketingMs("stagger") / 1000,
    ease: "calm",
    clearProps: "transform,opacity",
    scrollTrigger: { trigger: list, start: "top 86%", once: true },
  });
}

const FeatureTile: FC<{ feature: Feature }> = ({ feature }) => {
  const tilt = useTiltLight<HTMLLIElement>();
  const isAi = feature.key === AI_CONNECTION.key;
  return (
    <li className={featureItem} data-feature={feature.key} ref={tilt}>
      <Card className={featureCard} material="glass" padding="lg">
        <div className={featurePicture}>
          <Illustration scene={FEATURE_PICTURES[feature.key]} size="sm" variant="document" />
        </div>
        <h3 className={featureName}>
          <Link className={featureLink} to={feature.path}>
            {feature.name}
          </Link>
        </h3>
        <p className={featureText}>{isAi ? feature.menuDescription : feature.lead}</p>
        {isAi && <p className={featureNote}>{AI_CONNECTION_ACCESS}</p>}
      </Card>
    </li>
  );
};

/**
 * "Flump features" (ROLLOUT-PLAN M1, from prototype 11): the five areas in the app's order and the
 * AI connection, one glass tile each with its document picture. Below `lg` a sideways carousel with
 * dots and real previous and next buttons, never a count (MK9); every tile is in the HTML in order.
 */
export const HomeFeatures: FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const names = FEATURES.map((feature) => feature.name);
  const { position, current, goTo } = useCarousel(listRef, names.length);
  useGsapMoment(rootRef, featuresMoment);

  return (
    <MarketingSection
      className={featuresBand}
      id="features"
      subtitle="The same five areas as the app. Use one or all five."
      title={FEATURES_INDEX.title}
      tone="card"
    >
      <div className={bubbleLayer}>
        <BubbleField layout="b" />
      </div>
      <div className={strip} ref={rootRef}>
        <ul aria-label={LIST_LABEL} className={featureList} id={FEATURES_LIST_ID} ref={listRef}>
          {FEATURES.map((feature) => (
            <FeatureTile feature={feature} key={feature.key} />
          ))}
        </ul>
        <div
          className={controls()}
          data-testid="home-features-controls"
          id="home-features-controls"
          hidden={!position.overflow}
        >
          <CarouselStepButton
            controls={FEATURES_LIST_ID}
            direction="previous"
            disabled={position.first <= 0}
            targetLabel={names[position.first - 1]}
            onClick={() => goTo(position.first - 1)}
          />
          <CarouselDots
            controls={FEATURES_LIST_ID}
            current={current}
            itemLabels={names}
            label={LIST_LABEL}
            onSelect={goTo}
          />
          <CarouselStepButton
            controls={FEATURES_LIST_ID}
            direction="next"
            disabled={position.last >= names.length - 1}
            targetLabel={names[position.first + 1]}
            onClick={() => goTo(position.first + 1)}
          />
        </div>
      </div>
      <p className={bandFooter}>
        <Link className={bandLink} to={FEATURES_INDEX.path}>
          All Flump features on one page
        </Link>
      </p>
    </MarketingSection>
  );
};
