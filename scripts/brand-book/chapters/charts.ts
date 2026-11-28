import { renderChartAnatomyDiagram } from "../diagrams/chartAnatomy";
import { renderChapterOpener, renderProvenanceComment } from "../renderHelpers";
import type { BrandTokens } from "../tokens";

export function renderChartsChapter(tokens: BrandTokens): string {
  const openerVisual = `<div class="opener-visual-plate" data-motion-hook="chart-specimen">
    ${renderChartAnatomyDiagram(tokens)}
  </div>`;

  const seriesChips = [
    {
      name: "Net worth and mortgage",
      tone: "var(--color-chart-primary)",
      note: "Primary teal line",
    },
    { name: "Savings", tone: "var(--color-chart-wealth)", note: "Sage pot growth" },
    { name: "What you owe", tone: "var(--color-chart-debt)", note: "Warm apricot, never red" },
    {
      name: "Future estimates",
      tone: "var(--color-chart-projection)",
      note: "Dashed line plus range band",
    },
  ]
    .map(
      (item) => `<article class="card" style="gap:var(--space-2)">
        <div style="height:8px;border-radius:var(--radius-full);background:${item.tone}"></div>
        <strong>${item.name}</strong>
        <span class="swatch-note">${item.note}</span>
      </article>`,
    )
    .join("");

  return `<section class="chapter" id="charts">
    ${renderChapterOpener({
      num: "09",
      title: "Charts",
      lead: "Every chart answers one clear question at a glance, labels lines directly and pairs colour with dashes, markers or text.",
      visualHtml: openerVisual,
      surface: "subtle",
      hook: "chapter-09",
    })}

    <div class="spread">
      <div class="spread-inner">
        <div class="editorial-copy">
          <h3 class="sub-title">Consistent series colour</h3>
          <p class="prose">
            Colour identifies an account or category across the product rather than grading gains or losses.
          </p>
        </div>
        <div class="grid-4">
          ${seriesChips}
        </div>
      </div>
    </div>

    <div class="spread spread-subtle">
      <div class="spread-inner">
        <div class="grid-2">
          <article class="card">
            <h3 class="card-title">Structure and accessibility</h3>
            <ul class="plain-list">
              <li>Every chart pairs a plain takeaway title with a visible one-sentence summary (at most two figures) and a "Show data" table.</li>
              <li>Use lines for change over time, sorted horizontal bars for parts of a whole, and progress bars against a limit; cap donut charts at five slices including "Other".</li>
              <li>Label up to three series directly at the end of the line so readers never have to bounce between chart and legend.</li>
              <li>Tap or keyboard focus selects a data point with a fixed readout, and arrow keys step cleanly from point to point.</li>
            </ul>
          </article>

          <article class="card">
            <h3 class="card-title">Axes, estimates and formatting</h3>
            <ul class="plain-list">
              <li>Future estimates use a dashed line with assumptions stated directly beneath; estimates over one year show a shaded range with low and high pound figures in text.</li>
              <li>Bar axes always start at zero, with no logarithmic scales or second vertical axis.</li>
              <li>Keep at most six ticks on the horizontal axis, format years in full ("2030") and use three-letter months ("Sep", never "Sept").</li>
              <li>All axis, legend and tooltip figures use fixed-width UK currency formatting, and unknown values show as "Not set" rather than zero.</li>
            </ul>
          </article>
        </div>
      </div>
    </div>

    ${renderProvenanceComment("STYLE-GUIDE 10; UX-GUIDELINES 8; docs/design/data-viz.md")}
  </section>`;
}
