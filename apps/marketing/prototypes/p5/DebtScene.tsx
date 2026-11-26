import type { FC } from "react";
import type { GsapKit } from "../shared/gsapKit";
import { formatGbp } from "../shared/sampleData";
import { DEBT, linePath } from "./data";
import { Scene, Sr } from "./Scene";

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
const setup = ({ gsap }: GsapKit, root: HTMLElement) => {
  const plot = root.querySelector<HTMLElement>(".p5-debt__plot");
  const clip = root.querySelector<SVGRectElement>("#p5-debt-clip rect");
  const dot = root.querySelector<HTMLElement>(".p5-debt__dot");
  const readout = root.querySelector<HTMLElement>(".p5-debt__readout");
  if (!plot || !clip || !dot || !readout) return;
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
      trigger: plot,
      start: "top 80%",
      end: "bottom 35%",
      scrub: 0.6,
      onRefresh: () => {
        size = { w: plot.clientWidth, h: plot.querySelector("svg")?.clientHeight ?? 0 };
        place(tl.progress());
      },
    },
  });
  tl.fromTo(clip, { attr: { width: 0 } }, { attr: { width: W }, ease: "none", duration: 1 });
};

export const DebtScene: FC = () => (
  <Scene
    areaKey="debt-and-borrowing"
    layout="right"
    note={`In this example: a credit card and a personal loan, ${formatGbp(DEBT.start)} together, paid at ${formatGbp(DEBT.monthly)} a month. The mortgage is shown separately in the app.`}
    setup={setup}
  >
    <figure className="p5-debt">
      <figcaption className="p5-debt__caption">
        <span>Example card and loan balance</span>
        <span className="tabular-nums">
          {formatGbp(DEBT.start)} in {DEBT.startLabel}
        </span>
      </figcaption>
      <div className="p5-debt__plot">
        <svg aria-hidden="true" preserveAspectRatio="none" viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <clipPath id="p5-debt-clip">
              <rect height={H + 20} width={W} x="0" y="-10" />
            </clipPath>
          </defs>
          {[0.25, 0.5, 0.75].map((g) => (
            <line className="p5-grid" key={g} x1="0" x2={W} y1={H * g} y2={H * g} />
          ))}
          <line className="p5-debt__base" x1="0" x2={W} y1={H} y2={H} />
          <g clipPath="url(#p5-debt-clip)">
            <path className="p5-debt__area" d={AREA} />
            <path className="p5-debt__line" d={LINE} />
          </g>
        </svg>
        <span aria-hidden="true" className="p5-debt__dot">
          <span className="p5-debt__readout tabular-nums" />
        </span>
        <ol aria-hidden="true" className="p5-debt__ticks">
          {TICKS.map((t) => (
            <li key={t.label} style={{ left: `${t.pct}%` }}>
              {t.label}
            </li>
          ))}
        </ol>
      </div>
      <p className="p5-debt__end">
        <span>Estimated paid off</span>
        <strong className="tabular-nums">{DEBT.endLabel}</strong>
        <span className="p5-debt__months tabular-nums">{DEBT.months} monthly payments</span>
      </p>
      <Sr>
        The balance falls from {formatGbp(DEBT.start)} in {DEBT.startLabel} to nothing in{" "}
        {DEBT.endLabel}.
      </Sr>
    </figure>
  </Scene>
);
