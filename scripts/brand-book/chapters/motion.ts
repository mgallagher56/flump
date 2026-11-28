import { renderSourceCite, renderTokenRow } from "../renderHelpers";
import type { BrandTokens } from "../tokens";

export function renderMotionChapter(tokens: BrandTokens): string {
  const { authored } = tokens;

  const appDurationNotes: Record<string, string> = {
    instant: "Immediate state swap (reduced motion)",
    fast: "Hover, press, scenario result changing",
    base: "Tabs, disclosure, toasts",
    slow: "Sheets, dialogs, onboarding step cap (AT7)",
    loop: "One turn of a continuous loading spinner",
    reveal: "Content fade-in after a shown placeholder (UX-GUIDELINES E2)",
    pendingDelay: "No loading UI shown before this delay",
    pendingMinimum: "Minimum time a shown loading UI stays visible",
    draw: "A line or tick drawing itself in once",
    scene: "An illustration settling on first view; saved figure wash",
  };

  const appEasingNotes: Record<string, string> = {
    standard: "Moving within the screen",
    enter: "Arriving on screen",
    exit: "Leaving the screen",
    settle: "Soft landing with no overshoot for scene motion",
  };

  const marketingDurationNotes: Record<string, string> = {
    glide: "Pay rise tool result gliding to its new value (MK13)",
    hover: "Hover light, tilt settle, colour changes (420 x 1.4)",
    stagger: "Gap between neighbours arriving (140 x 1.4)",
    disclosure: "FAQ or more detail opening or closing (700 x 1.4)",
    entry: "One card, tag or line arriving (1100 x 1.4)",
    count: "Sample figure tagged Example counting once (1600 x 1.4)",
    chart: "Chart line drawing itself once (1900 x 1.4)",
    hero: "Full timed hero sequence (3400 x 1.4)",
  };

  const marketingEasingNotes: Record<string, string> = {
    calm: "Arriving, opening, gliding (no overshoot)",
    calmInOut: "Travel and disclosure height (no overshoot)",
  };

  const appDurationRows = Object.entries(authored.primitiveDurations).map(([key, token]) =>
    renderTokenRow(`durations.${key}`, token.value, appDurationNotes[key] ?? "App timing"),
  );
  const appEasingRows = Object.entries(authored.primitiveEasings).map(([key, token]) =>
    renderTokenRow(`easings.${key}`, token.value, appEasingNotes[key] ?? "App easing"),
  );
  const marketingDurationRows = Object.entries(authored.marketingDurations).map(([key, token]) =>
    renderTokenRow(
      `durations.marketing.${key}`,
      token.value,
      marketingDurationNotes[key] ?? "Marketing calm scale",
    ),
  );
  const marketingEasingRows = Object.entries(authored.marketingEasings).map(([key, token]) =>
    renderTokenRow(
      `easings.marketing.${key}`,
      token.value,
      marketingEasingNotes[key] ?? "Marketing easing",
    ),
  );

  return `<section class="chapter" id="motion">
    <div class="chapter-head">
      <span class="chapter-kicker">Chapter 08</span>
      <h2 class="chapter-title">Motion</h2>
    </div>

    <p class="prose">
      Flump has two motion settings (27 November 2026). In the web and mobile apps, people read their own money, so motion stays quiet, explains state changes and never moves a figure while it is read. On the marketing site, calm scroll-triggered and ambient scenes show how Flump works using sample figures. GSAP and three.js are restricted strictly to <code>apps/marketing</code> (Rule AT4).
    </p>

    <h3 class="sub-title">App tiers (web and mobile)</h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th scope="col">Tier</th><th scope="col">Rule</th><th scope="col">Examples</th></tr></thead>
        <tbody>
          <tr><td><strong>Tier A: always fine</strong></td><td>Changes no layout, timing or reading order</td><td>Tokens, glass card material on non-data cards, document pictures in empty states, still focus and hover light</td></tr>
          <tr><td><strong>Tier B: named moments only</strong></td><td>Plays once per visit after content is readable, never on a control</td><td>Chart draws once (<code>useChartAnimation</code>), saved figure wash, check-in advance, setup progress ring, save tick, empty-state settle, onboarding entrances</td></tr>
          <tr><td><strong>Tier C: never in the app</strong></td><td>Delays reading or moves what holds a figure</td><td>Scroll-driven scenes, three.js or WebGL, parallax, bubble fields behind data, tilt on cards holding figures, count-up on real money</td></tr>
        </tbody>
      </table>
    </div>

    <h3 class="sub-title">App motion tokens</h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th scope="col">Token</th><th scope="col">Value</th><th scope="col">Use</th></tr></thead>
        <tbody>
          ${appDurationRows.join("")}
          ${appEasingRows.join("")}
        </tbody>
      </table>
    </div>

    <h3 class="sub-title">Marketing calm scale (prototype 11 timings x 1.4)</h3>
    <p class="prose">
      Marketing durations and easings are kept apart in <code>durations.marketing.*</code> and <code>easings.marketing.*</code> so app timings never change for them. Neither marketing easing overshoots, and there are no faster variants.
    </p>
    <div class="table-wrap">
      <table>
        <thead><tr><th scope="col">Token</th><th scope="col">Value</th><th scope="col">Use</th></tr></thead>
        <tbody>
          ${marketingDurationRows.join("")}
          ${marketingEasingRows.join("")}
        </tbody>
      </table>
    </div>

    <div class="grid-2">
      <article class="card-subtle">
        <h3 class="card-title">Where figures may move (MK13)</h3>
        <p class="prose">
          Real figures never count up, roll or glide in the apps. On marketing only, a fixed sample figure tagged "Example" may count up once on first view (with final value in HTML for screen readers, MK10), and the interactive pay rise calculator result may glide over <code>durations.marketing.glide</code>.
        </p>
      </article>

      <article class="card-subtle">
        <h3 class="card-title">Reduced motion and still fallbacks (M4, MK1, MK11, MK14)</h3>
        <p class="prose">
          Under <code>prefers-reduced-motion: reduce</code>, changes are instant or a short fade; chart drawing, counting, gliding and ambient motion stop. On marketing, GSAP and three.js are not loaded, the orb is a still image and bubble fields stand still. On marketing, the header's "Reduce motion" button on every page gives the same still site, remembered across pages and visits; it stops any scene that would move for more than 5 seconds.
        </p>
      </article>
    </div>

    ${renderSourceCite("STYLE-GUIDE 11, 11.1, 11.2; UX-GUIDELINES 12, 12.1, 12.2; packages/tokens/src/motion.ts")}
  </section>`;
}
