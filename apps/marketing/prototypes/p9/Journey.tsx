import { Button } from "@repo/ui";
import { type FC, type ReactNode, useRef } from "react";
import { Link } from "react-router-dom";
import { bandLink, ctaRow } from "../../src/pages/HomePage/HomePage.styles";
import { MONEY_AREAS, type MoneyAreaKey } from "../../src/utils/featureAreas";
import { signupCta } from "../../src/utils/site";
import { usePace } from "../shared/pace";
import { useLazyScene } from "../shared/useLazyScene";
import { STOP_VISUALS } from "./JourneyStops";
import "./p9.css";

/** A stop on the journey: one of the five areas, or the finished Home page. */
export type StopKey = MoneyAreaKey | "dashboard";

export const ALL_STOPS: readonly StopKey[] = [...MONEY_AREAS.map((area) => area.key), "dashboard"];

/** The id of a stop's section, for a scroll cue or a link into the journey. */
export const journeyStopId = (key: StopKey) => `p9-stop-${key}`;

const SHORT: Record<StopKey, string> = {
  accounts: "Accounts",
  budget: "Budget",
  pay: "Pay",
  "savings-and-pension": "Savings",
  "debt-and-borrowing": "Debt",
  dashboard: "The picture",
};

/** The two calls to action, with the pointer light (needs `usePointerLightAndTilt` on the page). */
export const LitCtas: FC = () => {
  const cta = signupCta();
  return (
    <div className={ctaRow()}>
      <Button asChild size="lg" variant="primary">
        <a data-light="" data-proto="cta-primary" href={cta.href}>
          {cta.label}
        </a>
      </Button>
      <Button asChild size="lg" variant="outline">
        <a data-light="" data-proto="cta-secondary" href="/preview">
          Interactive preview
        </a>
      </Button>
    </div>
  );
};

interface StopCopy {
  title: string;
  lead: string;
  fact: string;
  link?: { to: string; label: string };
}

const copyFor = (key: StopKey): StopCopy => {
  if (key === "dashboard")
    return {
      title: "Where you stand, on one page",
      lead: "Your Home page shows your net worth, what is left over each month and your breathing room.",
      fact: "Breathing room is how long your savings would cover the essentials.",
    };
  const area = MONEY_AREAS.find((a) => a.key === key);
  return {
    title: area?.h1 ?? "",
    lead: area?.lead ?? "",
    fact: area?.facts[0] ?? "",
    link: area ? { to: area.path, label: `About ${area.name.toLowerCase()} in Flump` } : undefined,
  };
};

const Stop: FC<{ stopKey: StopKey; index: number }> = ({ stopKey, index }) => {
  const copy = copyFor(stopKey);
  const Visual = STOP_VISUALS[stopKey];
  const titleId = `${journeyStopId(stopKey)}-title`;
  // The text panel and the visual swap sides at every stop (on phones the visual sits above).
  const cardSide = index % 2 === 0 ? "right" : "left";
  return (
    <section
      aria-labelledby={titleId}
      className="p9-stop"
      data-card-side={cardSide}
      data-proto-name={SHORT[stopKey]}
      data-proto-section=""
      data-stop={index + 1}
      data-stop-key={stopKey}
      id={journeyStopId(stopKey)}
    >
      <div className="p9-stop__panel" data-tilt="">
        <h2 className="p9-stop__title" id={titleId}>
          {copy.title}
        </h2>
        <p className="p9-stop__lead">{copy.lead}</p>
        <p className="p9-stop__fact">{copy.fact}</p>
        {copy.link ? (
          <Link className={bandLink()} to={copy.link.to}>
            {copy.link.label}
          </Link>
        ) : (
          <div className="p9-ctas">
            <LitCtas />
          </div>
        )}
      </div>
      <div className="p9-stop__visual">
        <Visual />
      </div>
    </section>
  );
};

/**
 * The journey: a camera travels through layered space past one stop per area, and the reader's
 * scroll moves it. Each stop's copy is in normal flow; its 3D visual is an aria-hidden copy of the
 * still visual beside it, which it lands on exactly. Glass orbs, bubbles and a bead line travel
 * through the scene in the palette's colours.
 *
 * Works as part of a page: the 3D layer is sticky inside the journey, so it starts and stops with
 * the journey's own bounds, and the scene renders only while the journey is on screen. `intro`
 * (optional) is placed inside the journey before the first stop, so a hero can sit in the scene;
 * without it the camera approaches the first stop as the journey scrolls into view. The page
 * should call `usePointerLightAndTilt` on its root for the panels' tilt and the buttons' light.
 */
export const Journey: FC<{ stops?: readonly StopKey[]; intro?: ReactNode }> = ({
  stops = ALL_STOPS,
  intro,
}) => {
  const journeyRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pace = usePace();
  const factor = useRef(pace.factor);
  factor.current = pace.factor;
  const { state, reason } = useLazyScene(stageRef, async (container, fallback) => {
    const { createJourneyScene } = await import("./journeyScene");
    const journey = journeyRef.current;
    if (!journey) throw new Error("No journey");
    return createJourneyScene({
      container,
      journey,
      onFallback: fallback,
      getPace: () => factor.current,
    });
  });

  return (
    <div className="p9-journey" data-scene={state} ref={journeyRef}>
      <div aria-hidden="true" className="p9-stage" ref={stageRef} />
      {intro && (
        <div className="p9-journey__intro" data-journey-intro="">
          {intro}
        </div>
      )}
      {stops.map((key, index) => (
        <Stop index={index} key={key} stopKey={key} />
      ))}
      <p className="p9-scene-note" data-testid="p9-scene-note">
        Scene: {state === "live" ? "3D" : `still (${reason.toLowerCase()})`}
      </p>
    </div>
  );
};
