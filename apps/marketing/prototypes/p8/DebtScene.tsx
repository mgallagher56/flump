import type { FC } from "react";
import { formatGbp } from "../shared/sampleData";
import { scrubFor } from "./calm";
import { Scene, type SceneSetup, Sr } from "./Scene";
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
const setup: SceneSetup = ({ gsap }, root, pace) => {
  const plot = root.querySelector<HTMLElement>(".p8-s-debt__plot");
  const clip = root.querySelector<SVGRectElement>("#p8-s-debt-clip rect");
  const dot = root.querySelector<HTMLElement>(".p8-s-debt__dot");
  const readout = root.querySelector<HTMLElement>(".p8-s-debt__readout");
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
      ...scrubFor(plot, pace, 1.4, "top 90%"),
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
    bubbles="c"
    tone="card"
    layout="right"
    note={`In this example: a credit card and a personal loan, ${formatGbp(DEBT.start)} together, paid at ${formatGbp(DEBT.monthly)} a month. The mortgage is shown separately in the app.`}
    setup={setup}
  >
    <figure className="p8-s-debt" data-p8-arrive="" data-tilt="">
      <figcaption className="p8-s-debt__caption">
        <span>Example card and loan balance</span>
        <span className="tabular-nums">
          {formatGbp(DEBT.start)} in {DEBT.startLabel}
        </span>
      </figcaption>
      <div className="p8-s-debt__plot">
        <svg aria-hidden="true" preserveAspectRatio="none" viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <clipPath id="p8-s-debt-clip">
              <rect height={H + 20} width={W} x="0" y="-10" />
            </clipPath>
          </defs>
          {[0.25, 0.5, 0.75].map((g) => (
            <line className="p8-s-grid" key={g} x1="0" x2={W} y1={H * g} y2={H * g} />
          ))}
          <line className="p8-s-debt__base" x1="0" x2={W} y1={H} y2={H} />
          <g clipPath="url(#p8-s-debt-clip)">
            <path className="p8-s-debt__area" d={AREA} />
            <path className="p8-s-debt__line" d={LINE} />
          </g>
        </svg>
        <span aria-hidden="true" className="p8-s-debt__dot">
          <span className="p8-s-debt__readout tabular-nums" />
        </span>
        <ol aria-hidden="true" className="p8-s-debt__ticks">
          {TICKS.map((t) => (
            <li key={t.label} style={{ left: `${t.pct}%` }}>
              {t.label}
            </li>
          ))}
        </ol>
      </div>
      <p className="p8-s-debt__end">
        <span>Estimated paid off</span>
        <strong className="tabular-nums">{DEBT.endLabel}</strong>
        <span className="p8-s-debt__months tabular-nums">{DEBT.months} monthly payments</span>
      </p>
      <Sr>
        The balance falls from {formatGbp(DEBT.start)} in {DEBT.startLabel} to nothing in{" "}
        {DEBT.endLabel}.
      </Sr>
    </figure>
  </Scene>
);
