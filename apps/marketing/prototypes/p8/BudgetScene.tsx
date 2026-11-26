import type { CSSProperties, FC } from "react";
import { formatGbp } from "../shared/sampleData";
import { scrubFor } from "./calm";
import { Scene, type SceneSetup } from "./Scene";
import { BUDGET } from "./sceneData";

/**
 * Scrubbed (prototype 5, slowed): the bar is what comes in. Each outgoing fills its share in turn,
 * left to right, and its line in the list comes up as it does; what is left over is the space that
 * remains, outlined last with its figure.
 */
const setup: SceneSetup = ({ gsap }, root, pace) => {
  const stage = root.querySelector<HTMLElement>(".p8-s-budget");
  if (!stage) return;
  const segments = gsap.utils.toArray<HTMLElement>(".p8-s-budget__seg", stage);
  const rows = gsap.utils.toArray<HTMLElement>(".p8-s-budget__row", stage);
  const step = 0.8;
  const tl = gsap.timeline({
    defaults: { ease: "calmInOut" },
    scrollTrigger: scrubFor(stage, pace, 1.4, "top 92%"),
  });
  segments.forEach((seg, i) => {
    tl.from(seg, { scaleX: 0, duration: 1.2 }, i * step);
    const row = rows[i];
    if (row) tl.from(row, { opacity: 0.35, y: 8, duration: 0.9, ease: "calm" }, i * step + 0.3);
  });
  const at = segments.length * step + 0.3;
  tl.from(".p8-s-budget__left", { scaleX: 0, duration: 1, ease: "calm" }, at);
  tl.from(".p8-s-budget__leftover", { opacity: 0, y: 12, duration: 0.9, ease: "calm" }, at + 0.2);
};

export const BudgetScene: FC = () => (
  <Scene
    areaKey="budget"
    bubbles="b"
    layout="right"
    note="In this example: six regular outgoings against one take-home salary."
    setup={setup}
  >
    <div className="p8-s-budget" data-p8-arrive="" data-tilt="">
      <p className="p8-s-budget__in">
        <span>Comes in each month</span>
        <strong className="tabular-nums">{formatGbp(BUDGET.comesIn)}</strong>
      </p>
      <div aria-hidden="true" className="p8-s-budget__bar">
        {BUDGET.segments.map((seg, i) => (
          <span
            className="p8-s-budget__seg"
            key={seg.id}
            style={
              {
                left: `${seg.start * 100}%`,
                width: `${seg.share * 100}%`,
                "--p8-s-i": i,
              } as CSSProperties
            }
          />
        ))}
        <span className="p8-s-budget__left" style={{ left: `${BUDGET.leftOverStart * 100}%` }} />
      </div>
      <ol aria-label="Example outgoings" className="p8-s-budget__rows">
        {BUDGET.segments.map((seg, i) => (
          <li className="p8-s-budget__row" key={seg.id} style={{ "--p8-s-i": i } as CSSProperties}>
            <span aria-hidden="true" className="p8-s-budget__swatch" />
            <span>{seg.label}</span>
            <span className="tabular-nums">{formatGbp(seg.amount)}</span>
          </li>
        ))}
      </ol>
      <p className="p8-s-budget__leftover">
        <span>Left over each month</span>
        <strong className="tabular-nums">{formatGbp(BUDGET.leftOver)}</strong>
      </p>
    </div>
  </Scene>
);
