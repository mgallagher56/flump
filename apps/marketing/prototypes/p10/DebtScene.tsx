import type { FC } from "react";
import type { GsapKit } from "../shared/gsapKit";
import { type PaceState, SCROLL } from "../shared/pace";
import { formatGbp } from "../shared/sampleData";
import { momentScroll } from "./moments";
import { Scene, Sr } from "./Scene";
import { DEBT, linePath } from "./sceneData";

const W = 1000;
const H = 300;
const values = DEBT.points.map((p) => p.value);
const LINE = linePath(values, W, H, DEBT.start);
const AREA = `${LINE} L${W},${H} L0,${H} Z`;
/** January of each year inside the schedule, as a tick on the time axis. */
const TICKS = DEBT.points
  .map((p, i) => ({ ...p, i }))
  .filter((p) => p.month === 0)
  .map((p) => ({ label: String(p.year), pct: (p.i / (values.length - 1)) * 100 }));

/**
 * Scrubbed: the combined balance runs down month by month to its end date, a marker riding the
 * line with that month's balance. Plain from start to end: the same ink as the text, no warning
 * colour, and the end date stated as a fact.
 */
const setup = ({ gsap }: GsapKit, root: HTMLElement, pace: PaceState) => {
  const plot = root.querySelector<HTMLElement>(".p10-sc-debt__plot");
  const clip = root.querySelector<SVGRectElement>("#p10-sc-debt-clip rect");
  const dot = root.querySelector<HTMLElement>(".p10-sc-debt__dot");
  const readout = root.querySelector<HTMLElement>(".p10-sc-debt__readout");
  if (!plot || !clip || !dot || !readout) return undefined;
  let size = { w: 0, h: 0 };
  let last = -1;
  const place = (p: number) => {
    const f = p * (values.length - 1);
    const i = Math.min(values.length - 2, Math.floor(f));
    const t = f - i;
    const v = (values[i] ?? 0) * (1 - t) + (values[i + 1] ?? 0) * t;
    gsap.set(dot, { x: p * size.w, y: (1 - v / DEBT.start) * size.h });
    const month = Math.round(f);
    if (month !== last) {
      last = month;
      const point = DEBT.points[month];
      if (point) readout.textContent = `${formatGbp(point.value)}, ${point.long}`;
      // The last month is stated under the chart, so the readout steps aside there.
      readout.style.visibility = month === values.length - 1 ? "hidden" : "visible";
    }
    dot.dataset.flip = String(p > 0.55);
  };
  const tl = gsap.timeline({
    onUpdate: () => place(tl.progress()),
    scrollTrigger: {
      ...momentScroll(plot, pace, SCROLL.moment * 1.6),
      onRefresh: () => {
        size = { w: plot.clientWidth, h: plot.querySelector("svg")?.clientHeight ?? 0 };
        place(tl.progress());
      },
    },
  });
  tl.fromTo(clip, { attr: { width: 0 } }, { attr: { width: W }, ease: "calmInOut", duration: 1 });
  tl.from(".p10-sc-debt__end", { opacity: 0, y: 12, duration: 0.25, ease: "calm" }, 0.8);
  return undefined;
};

export const DebtScene: FC = () => (
  <Scene
    areaKey="debt-and-borrowing"
    bubbles="c"
    layout="left"
    tone="canvas"
    note={`In this example: a credit card and a personal loan, ${formatGbp(DEBT.start)} together, paid at ${formatGbp(DEBT.monthly)} a month. The mortgage is shown separately in the app.`}
    setup={setup}
  >
    <figure className="p10-sc-debt" data-tilt="">
      <figcaption className="p10-sc-debt__caption">
        <span>Example card and loan balance</span>
        <span className="tabular-nums">
          {formatGbp(DEBT.start)} in {DEBT.startLabel}
        </span>
      </figcaption>
      <div className="p10-sc-debt__plot">
        <svg aria-hidden="true" preserveAspectRatio="none" viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <clipPath id="p10-sc-debt-clip">
              <rect height={H + 20} width={W} x="0" y="-10" />
            </clipPath>
          </defs>
          {[0.25, 0.5, 0.75].map((g) => (
            <line className="p10-sc-grid" key={g} x1="0" x2={W} y1={H * g} y2={H * g} />
          ))}
          <line className="p10-sc-debt__base" x1="0" x2={W} y1={H} y2={H} />
          <g clipPath="url(#p10-sc-debt-clip)">
            <path className="p10-sc-debt__area" d={AREA} />
            <path className="p10-sc-debt__line" d={LINE} />
          </g>
        </svg>
        <span aria-hidden="true" className="p10-sc-debt__dot">
          <span className="p10-sc-debt__readout tabular-nums" />
        </span>
        <ol aria-hidden="true" className="p10-sc-debt__ticks">
          {TICKS.map((t) => (
            <li key={t.label} style={{ left: `${t.pct}%` }}>
              {t.label}
            </li>
          ))}
        </ol>
      </div>
      <p className="p10-sc-debt__end">
        <span>Estimated paid off</span>
        <strong className="tabular-nums">{DEBT.endLabel}</strong>
        <span className="p10-sc-debt__months tabular-nums">{DEBT.months} monthly payments</span>
      </p>
      <Sr>
        The balance falls from {formatGbp(DEBT.start)} in {DEBT.startLabel} to nothing in{" "}
        {DEBT.endLabel}.
      </Sr>
    </figure>
  </Scene>
);
