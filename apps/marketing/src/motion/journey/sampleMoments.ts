import { dealInMoment } from "../../components/AccountTiles/dealInMoment";
import { countUpMoment } from "../../components/CountUpFigure/countUpMoment";
import { drawChartMoment } from "../../components/DrawnLineChart/drawChartMoment";
import { unfoldMoment } from "../../components/Payslip/unfoldMoment";
import { MOMENT_START, type SampleMoment } from "../moments/arrive";

/*
 * Each journey sample's own moment, added to its stop's arrive timeline (`pairArrive`), in arrive
 * units from `MOMENT_START` to before `MOMENT_END` (prototype 11's `stops/visuals.tsx` builders):
 * cards dealt into place, the budget bar filling, the payslip opening, a line drawing itself, the
 * Home page's tiles arriving. Time completes every moment (MK2); each is over before the stop
 * rests, and moves by distance and opacity on the calm eases (MK4), except the payslip's approved
 * unfold. Only figures beside an "Example" tag count, once (MK13).
 */

const all = (root: ParentNode, selector: string) => Array.from(root.querySelectorAll(selector));
const count = (root: ParentNode) => root.querySelector<HTMLElement>("[data-count]");

/** Budget: each outgoing fills its share of the bar in turn, its line coming up beside it. */
const fillBar: SampleMoment = (_kit, tl, root) => {
  const segments = all(root, "[data-bar-segment]");
  const rows = all(root, "[data-budget-row]");
  const left = all(root, "[data-bar-left]");
  const stats = all(root, "[data-budget-stat]");
  const step = 1.4 / Math.max(1, segments.length);
  segments.forEach((segment, i) => {
    tl.fromTo(
      segment,
      { scaleX: 0, transformOrigin: "0% 50%" },
      { scaleX: 1, duration: 0.45, ease: "calmInOut" },
      MOMENT_START + i * step,
    );
    const row = rows[i];
    if (row) {
      tl.fromTo(
        row,
        { opacity: 0.3, y: 6 },
        { opacity: 1, y: 0, duration: 0.4, ease: "calm" },
        MOMENT_START + 0.08 + i * step,
      );
    }
  });
  const at = MOMENT_START + segments.length * step;
  tl.fromTo(
    left,
    { scaleX: 0, opacity: 0, transformOrigin: "0% 50%" },
    { scaleX: 1, opacity: 1, duration: 0.4, ease: "calm" },
    at - 0.1,
  );
  tl.fromTo(
    stats,
    { opacity: 0, y: 10 },
    { opacity: 1, y: 0, duration: 0.4, ease: "calm", stagger: 0.12 },
    at,
  );
  countUpMoment(tl, count(root), at + 0.1, 0.5);
  return [...segments, ...rows, ...left, ...stats];
};

/** Savings: the year draws itself while the balance counts from the first month's. */
const savings: SampleMoment = (_kit, tl, root) => {
  drawChartMoment(tl, root, MOMENT_START, 1.8);
  countUpMoment(tl, count(root), MOMENT_START, 1.8);
  return [];
};

/** Debt: the balance counts, the line runs down to the end date, then the two facts come up. */
const debt: SampleMoment = (_kit, tl, root) => {
  drawChartMoment(tl, root, MOMENT_START, 1.8);
  countUpMoment(tl, count(root), MOMENT_START, 0.9);
  const facts = all(root, "[data-graph-fact]");
  tl.fromTo(
    facts,
    { opacity: 0, y: 8 },
    { opacity: 1, y: 0, duration: 0.4, ease: "calm", stagger: 0.12 },
    MOMENT_START + 1.5,
  );
  return facts;
};

/** The picture: the Home page's tiles arrive in turn, each figure counting as it comes. */
const tiles: SampleMoment = (_kit, tl, root) => {
  const items = all(root, "[data-tile]") as HTMLElement[];
  items.forEach((tile, i) => {
    tl.fromTo(
      tile,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.6, ease: "calm" },
      MOMENT_START + i * 0.25,
    );
    countUpMoment(tl, count(tile), MOMENT_START + 0.1 + i * 0.25, 1.3);
  });
  return items;
};

/** Each sample's moment, by the sample's `data-sample` name. */
export const SAMPLE_MOMENTS: Record<string, SampleMoment> = {
  accounts: dealInMoment,
  budget: fillBar,
  pay: unfoldMoment,
  savings,
  debt,
  picture: tiles,
};
