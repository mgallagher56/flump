import type { FC } from "react";
import { Journey, type StopKey } from "../p9/Journey";

/** Three stops for the middle of this page; the two scenes below show debt and pay. */
export const JOURNEY_STOPS: readonly StopKey[] = ["accounts", "budget", "savings-and-pension"];

/**
 * The middle of the page: prototype 9's journey (imported read-only), shortened to three stops,
 * with a short heading as its intro so the camera arrives at the first stop as it scrolls in.
 */
export const JourneyMiddle: FC = () => (
  <div className="p10-journey-live" id="journey">
    <Journey
      intro={
        <header className="p10-journey__head">
          <h2 className="p10-journey__title" id="journey-title">
            From rough figures to one picture
          </h2>
          <p className="p10-journey__lead">
            Start with what you have, then what comes in and goes out, then what you put by.
          </p>
        </header>
      }
      stops={JOURNEY_STOPS}
    />
  </div>
);
