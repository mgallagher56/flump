import type { CSSProperties, FC } from "react";
import type { GsapKit } from "../shared/gsapKit";
import { formatGbp } from "../shared/sampleData";
import { BUDGET } from "./data";
import { Scene } from "./Scene";

/**
 * Scrubbed: the bar is what comes in. Each outgoing fills its share in turn, left to right, and
 * its line in the list comes up as it does; what is left over is the space that remains, outlined
 * last with its figure.
 */
const setup = ({ gsap }: GsapKit, root: HTMLElement) => {
  const stage = root.querySelector<HTMLElement>(".p5-budget");
  if (!stage) return;
  const segments = gsap.utils.toArray<HTMLElement>(".p5-budget__seg", stage);
  const rows = gsap.utils.toArray<HTMLElement>(".p5-budget__row", stage);
  const step = 0.7;
  const tl = gsap.timeline({
    defaults: { ease: "flumpInOut" },
    scrollTrigger: { trigger: stage, start: "top 80%", end: "bottom 45%", scrub: 0.6 },
  });
  segments.forEach((seg, i) => {
    tl.from(seg, { scaleX: 0, duration: 1 }, i * step);
    const row = rows[i];
    if (row) tl.from(row, { opacity: 0.35, x: -6, duration: 0.6, ease: "flump" }, i * step + 0.3);
  });
  const at = segments.length * step + 0.3;
  tl.from(".p5-budget__left", { scaleX: 0, duration: 0.8, ease: "flump" }, at);
  tl.from(".p5-budget__leftover", { opacity: 0, y: 10, duration: 0.7, ease: "flump" }, at + 0.2);
};

export const BudgetScene: FC = () => (
  <Scene
    areaKey="budget"
    layout="right"
    note="In this example: six regular outgoings against one take-home salary."
    setup={setup}
  >
    <div className="p5-budget">
      <p className="p5-budget__in">
        <span>Comes in each month</span>
        <strong className="tabular-nums">{formatGbp(BUDGET.comesIn)}</strong>
      </p>
      <div aria-hidden="true" className="p5-budget__bar">
        {BUDGET.segments.map((seg, i) => (
          <span
            className="p5-budget__seg"
            key={seg.id}
            style={
              {
                left: `${seg.start * 100}%`,
                width: `${seg.share * 100}%`,
                "--p5-i": i,
              } as CSSProperties
            }
          />
        ))}
        <span className="p5-budget__left" style={{ left: `${BUDGET.leftOverStart * 100}%` }} />
      </div>
      <ol aria-label="Example outgoings" className="p5-budget__rows">
        {BUDGET.segments.map((seg, i) => (
          <li className="p5-budget__row" key={seg.id} style={{ "--p5-i": i } as CSSProperties}>
            <span aria-hidden="true" className="p5-budget__swatch" />
            <span>{seg.label}</span>
            <span className="tabular-nums">{formatGbp(seg.amount)}</span>
          </li>
        ))}
      </ol>
      <p className="p5-budget__leftover">
        <span>Left over each month</span>
        <strong className="tabular-nums">{formatGbp(BUDGET.leftOver)}</strong>
      </p>
    </div>
  </Scene>
);
