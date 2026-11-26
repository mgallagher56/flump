import { type FC, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { AI_CONNECTION, FEATURES_INDEX, MONEY_AREAS } from "../../src/utils/featureAreas";
import { useMotion } from "../shared/motion";
import { AREA_SAMPLES, formatGbp } from "./areaSamples";

/**
 * "Flump features" as a pinned section that steps through the five app areas as the reader
 * scrolls. Without script, or with reduced motion, it is a plain stacked list with nothing lost.
 * GSAP and ScrollTrigger load only when the stepper is enhanced; scroll stays native (scrub, no
 * snapping, no wheel capture).
 */
export const AreaStepper: FC = () => {
  const { reduced } = useMotion();
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced) return;
    // A very short viewport (a phone on its side) keeps the stacked list.
    if (window.innerHeight < 520) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    import("./stepperTimeline").then(({ enhanceStepper }) => {
      if (cancelled) return;
      cleanup = enhanceStepper(root);
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [reduced]);

  return (
    <section aria-labelledby="areas-title" className="p2-areas" data-enhanced="false" ref={rootRef}>
      <div className="p2-areas__pin">
        <div className="p2-areas__head">
          <h2 id="areas-title">{FEATURES_INDEX.title}</h2>
          <p>The same five areas as the app. Use one or all five.</p>
        </div>
        <ol aria-label="The five areas" className="p2-areas__nav">
          {MONEY_AREAS.map((area, index) => (
            <li key={area.key} style={{ "--proto-i": index } as React.CSSProperties}>
              <Link to={area.path}>{area.name}</Link>
              <span aria-hidden="true" className="p2-areas__bar" />
            </li>
          ))}
        </ol>
        <div className="p2-areas__panels">
          {MONEY_AREAS.map((area, index) => (
            <article
              aria-labelledby={`area-${area.key}`}
              className="p2-area"
              data-index={index}
              key={area.key}
            >
              <div className="p2-area__text">
                <h3 id={`area-${area.key}`}>{area.name}</h3>
                <p>{area.lead}</p>
                <ul>
                  {area.depth.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <Link className="p2-link" to={area.path}>
                  About {area.name.toLowerCase()} in Flump
                </Link>
              </div>
              <figure
                className="p2-sample"
                aria-label={`Example ${area.name.toLowerCase()} figures`}
              >
                <figcaption>Example</figcaption>
                {AREA_SAMPLES[area.key].map((figure) => (
                  <div className="p2-sample__card" key={figure.label}>
                    <span className="p2-sample__label">{figure.label}</span>
                    <span className="p2-sample__value tabular-nums">
                      {formatGbp(figure.value)}
                      {figure.suffix && <small> {figure.suffix}</small>}
                    </span>
                  </div>
                ))}
              </figure>
            </article>
          ))}
        </div>
      </div>
      <p className="p2-areas__foot">
        <Link className="p2-link" to={AI_CONNECTION.path}>
          {AI_CONNECTION.name}
        </Link>
        : {AI_CONNECTION.menuDescription}.{" "}
        <Link className="p2-link" to={FEATURES_INDEX.path}>
          All Flump features on one page
        </Link>
      </p>
    </section>
  );
};
