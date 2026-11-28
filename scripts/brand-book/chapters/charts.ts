import { renderChartAnatomyDiagram } from "../diagrams/chartAnatomy";
import { renderProvenanceComment } from "../renderHelpers";
import type { BrandTokens } from "../tokens";

export function renderChartsChapter(tokens: BrandTokens): string {
  return `<section class="chapter" id="charts">
    <div class="chapter-head">
      <span class="chapter-kicker">Chapter 09</span>
      <h2 class="chapter-title">Charts</h2>
    </div>

    <p class="prose">
      Charts answer one clear question at a glance without forcing the reader to decode a legend. Colour identifies an account or category consistently across the product, never whether an outcome is good or bad, and debts always appear in warm apricot rather than red.
    </p>

    ${renderChartAnatomyDiagram(tokens)}

    <h3 class="sub-title">Chart rules</h3>
    <div class="grid-2">
      <article class="card">
        <h4 class="card-title">Structure and accessibility</h4>
        <ul class="plain-list">
          <li>Every chart pairs a plain takeaway title with a visible one-sentence summary (at most two figures) and a "Show data" table.</li>
          <li>Use lines for change over time, sorted horizontal bars for parts of a whole, and progress bars against a limit; cap donut charts at five slices including "Other".</li>
          <li>Label up to three series directly at the end of the line; pair colours with dashes, markers or labels so meaning never rests on colour alone.</li>
          <li>Tap or keyboard focus selects a data point with a fixed readout, and arrow keys step from point to point.</li>
        </ul>
      </article>

      <article class="card">
        <h4 class="card-title">Axes, estimates and formatting</h4>
        <ul class="plain-list">
          <li>Future estimates use a dashed line with assumptions stated directly beneath; estimates over one year show a shaded range with low and high pound figures in text.</li>
          <li>Bar axes always start at zero, with no logarithmic scales or second vertical axis.</li>
          <li>Keep at most six ticks on the horizontal axis, format years in full ("2030") and use three-letter months ("Sep", never "Sept").</li>
          <li>All axis, legend and tooltip figures use fixed-width UK currency formatting, and unknown values show as "Not set" rather than zero.</li>
        </ul>
      </article>
    </div>

    ${renderProvenanceComment("STYLE-GUIDE 10; UX-GUIDELINES 8; docs/design/data-viz.md")}
  </section>`;
}
