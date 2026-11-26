import type { CSSProperties, FC } from "react";
import { SCROLL } from "../shared/pace";
import { formatGbp } from "../shared/sampleData";
import { Scene, type SceneSetup, Sr } from "./Scene";
import { linePath, SAVINGS } from "./sceneData";

const W = 1200;
const H = 300;
const values = SAVINGS.points.map((p) => p.value);
const MIN = Math.floor((Math.min(...values) - 600) / 500) * 500;
const MAX = Math.ceil((Math.max(...values) + 900) / 500) * 500;
const LINE = linePath(values, W, H, MAX, MIN);
const AREA = `${LINE} L${W},${H} L0,${H} Z`;
const lowest = values.indexOf(Math.min(...values.slice(6)));
const CALLOUTS = [0, lowest, values.length - 1];

const xPct = (i: number) => (i / (values.length - 1)) * 100;
const yPct = (v: number) => (1 - (v - MIN) / (MAX - MIN)) * 100;

/**
 * The page's one sideways scene (prototype 5, slowed). Pinned for the pace's sideways distance: as the reader scrolls down, the year
 * travels right to left under a fixed frame while the line draws itself and a marker rides its end
 * with the balance for that month. Without script the whole year fits the frame, nothing hidden.
 */
const setup: SceneSetup = ({ gsap }, root, pace) => {
  const pin = root.querySelector<HTMLElement>(".p8-s-scene__inner");
  const frame = root.querySelector<HTMLElement>(".p8-s-savings__frame");
  const track = root.querySelector<HTMLElement>(".p8-s-savings__track");
  const clip = root.querySelector<SVGRectElement>("#p8-s-savings-clip rect");
  const dot = root.querySelector<HTMLElement>(".p8-s-savings__dot");
  const readout = root.querySelector<HTMLElement>(".p8-s-savings__readout");
  if (!pin || !frame || !track || !clip || !dot || !readout) return;
  const callouts = gsap.utils.toArray<HTMLElement>(".p8-s-savings__callout", root);
  let size = { w: 0, h: 0 };
  let lastMonth = -1;
  const place = (p: number) => {
    const f = p * (values.length - 1);
    const i = Math.min(values.length - 2, Math.floor(f));
    const t = f - i;
    const v = (values[i] ?? 0) * (1 - t) + (values[i + 1] ?? 0) * t;
    gsap.set(dot, { x: p * size.w, y: (yPct(v) / 100) * size.h });
    const month = Math.round(f);
    if (month !== lastMonth) {
      lastMonth = month;
      const point = SAVINGS.points[month];
      if (point) readout.textContent = `${formatGbp(point.value)}, ${point.long}`;
      // At a labelled month the callout says it already.
      readout.style.opacity = CALLOUTS.includes(month) ? "0" : "1";
    }
    callouts.forEach((c) => {
      const at = Number(c.dataset.at) / (values.length - 1);
      c.style.opacity = p >= at - 0.02 ? "1" : "0";
    });
  };
  const header = document.querySelector("header");
  const headerOffset = () =>
    header && ["sticky", "fixed"].includes(getComputedStyle(header).position)
      ? header.offsetHeight
      : 0;
  const tl = gsap.timeline({
    onUpdate: () => place(tl.progress()),
    scrollTrigger: {
      trigger: pin,
      start: () => `top top+=${headerOffset()}`,
      end: () => `+=${pace.px(SCROLL.sideways)}`,
      pin: true,
      scrub: pace.s(1000),
      invalidateOnRefresh: true,
      onRefresh: () => {
        size = { w: track.offsetWidth, h: track.querySelector("svg")?.clientHeight ?? 0 };
        place(tl.progress());
      },
    },
  });
  tl.fromTo(
    track,
    { x: 0 },
    { x: () => -(track.offsetWidth - frame.clientWidth), ease: "none", duration: 1 },
    0,
  ).fromTo(clip, { attr: { width: 0 } }, { attr: { width: W }, ease: "none", duration: 1 }, 0);
  return () => {
    for (const c of callouts) c.style.opacity = "";
  };
};

export const SavingsScene: FC = () => (
  <Scene
    areaKey="savings-and-pension"
    layout="wide"
    note={`In this example: a cash savings balance over the past year, ending at ${formatGbp(SAVINGS.end)}. Example history, not a forecast.`}
    setup={setup}
  >
    <figure className="p8-s-savings">
      <figcaption className="p8-s-savings__caption">
        Example savings balance, {SAVINGS.points[0]?.long} to {SAVINGS.points.at(-1)?.long}
      </figcaption>
      <div className="p8-s-savings__frame">
        <div className="p8-s-savings__track">
          <div className="p8-s-savings__plot">
            <svg aria-hidden="true" preserveAspectRatio="none" viewBox={`0 0 ${W} ${H}`}>
              <defs>
                <clipPath id="p8-s-savings-clip">
                  <rect height={H + 20} width={W} x="0" y="-10" />
                </clipPath>
              </defs>
              {[0.25, 0.5, 0.75].map((g) => (
                <line className="p8-s-grid" key={g} x1="0" x2={W} y1={H * g} y2={H * g} />
              ))}
              <g clipPath="url(#p8-s-savings-clip)">
                <path className="p8-s-savings__area" d={AREA} />
                <path className="p8-s-savings__line" d={LINE} />
              </g>
            </svg>
            {CALLOUTS.map((i) => {
              const point = SAVINGS.points[i];
              if (!point) return null;
              return (
                <p
                  className="p8-s-savings__callout"
                  data-at={i}
                  data-edge={i === 0 ? "start" : i === values.length - 1 ? "end" : "mid"}
                  key={i}
                  style={{ left: `${xPct(i)}%`, top: `${yPct(point.value)}%` } as CSSProperties}
                >
                  <span className="tabular-nums">{formatGbp(point.value)}</span>
                  <span>{i === values.length - 1 ? "Now" : point.long}</span>
                </p>
              );
            })}
            <span aria-hidden="true" className="p8-s-savings__dot">
              <span className="p8-s-savings__readout tabular-nums" />
            </span>
          </div>
          <ol aria-hidden="true" className="p8-s-savings__months">
            {SAVINGS.points.map((p, i) => (
              <li key={p.long} style={{ left: `${xPct(i)}%` }}>
                {p.label}
              </li>
            ))}
          </ol>
        </div>
      </div>
      <Sr>
        Monthly balances: {SAVINGS.points.map((p) => `${p.long} ${formatGbp(p.value)}`).join(", ")}.
      </Sr>
    </figure>
  </Scene>
);
