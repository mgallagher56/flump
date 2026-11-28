import { renderChartAnatomyDiagram } from "../diagrams/chartAnatomy";
import { renderChapterOpener, renderProvenanceComment } from "../renderHelpers";
import { type BrandTokens, colorVar } from "../tokens";

export function renderChartsChapter(tokens: BrandTokens): string {
  const h = tokens.sampleHousehold;
  const drawMs = Number.parseFloat(tokens.authored.primitiveDurations.draw.value);
  const openerVisual = `<div class="opener-visual-plate" data-motion-hook="chart-specimen">
    ${renderChartAnatomyDiagram(tokens)}
  </div>`;

  const drawnChartSvg = `<svg viewBox="0 0 640 240" role="img" aria-labelledby="diag-draw-chart-title diag-draw-chart-desc">
    <title id="diag-draw-chart-title">Self-drawing savings chart</title>
    <desc id="diag-draw-chart-desc">Sample household cash and savings line drawing from June to November, ending at ${h.savings} and ${h.savingsRate}.</desc>
    <rect x="1" y="1" width="638" height="238" rx="14" fill="${colorVar("surface.card")}" stroke="${colorVar("border")}"/>
    <text x="24" y="30" fill="${colorVar("text.primary")}" font-family="var(--font-heading)" font-size="13" font-weight="600">Cash and savings over six months</text>
    <rect x="552" y="14" width="64" height="22" rx="11" fill="${colorVar("surface.sunken")}" stroke="${colorVar("border")}"/>
    <text x="584" y="29" text-anchor="middle" fill="${colorVar("text.secondary")}" font-family="var(--font-body)" font-size="11" font-weight="500">Example</text>

    <line x1="72" y1="62" x2="540" y2="62" stroke="${colorVar("chart.grid")}" stroke-width="1"/>
    <line x1="72" y1="106" x2="540" y2="106" stroke="${colorVar("chart.grid")}" stroke-width="1"/>
    <line x1="72" y1="150" x2="540" y2="150" stroke="${colorVar("chart.grid")}" stroke-width="1"/>
    <line x1="72" y1="194" x2="540" y2="194" stroke="${colorVar("chart.baseline")}" stroke-width="1.25"/>

    <text x="60" y="66" text-anchor="end" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11" style="font-variant-numeric:tabular-nums">£24k</text>
    <text x="60" y="110" text-anchor="end" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11" style="font-variant-numeric:tabular-nums">£18k</text>
    <text x="60" y="154" text-anchor="end" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11" style="font-variant-numeric:tabular-nums">£12k</text>
    <text x="60" y="198" text-anchor="end" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11" style="font-variant-numeric:tabular-nums">£6k</text>

    <path class="motion-chart-area" d="M72,162 L165,148 L259,134 L353,120 L446,104 L540,86 L540,194 L72,194 Z" fill="${colorVar("chart.wealth")}" fill-opacity="0.14"/>
    <path class="motion-chart-line" pathLength="100" d="M72,162 L165,148 L259,134 L353,120 L446,104 L540,86" fill="none" stroke="${colorVar("chart.wealth")}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <circle class="motion-chart-dot" cx="540" cy="86" r="5" fill="${colorVar("chart.wealth")}"/>

    <text x="554" y="83" fill="${colorVar("text.primary")}" font-family="var(--font-heading)" font-size="13" font-weight="700" style="font-variant-numeric:tabular-nums">${h.savings}</text>
    <text x="554" y="102" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11" style="font-variant-numeric:tabular-nums">${h.savingsRate}</text>

    <text x="72" y="220" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11">Jun</text>
    <text x="165" y="220" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11">Jul</text>
    <text x="259" y="220" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11">Aug</text>
    <text x="353" y="220" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11">Sep</text>
    <text x="446" y="220" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11">Oct</text>
    <text x="540" y="220" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11">Nov</text>
  </svg>`;

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
        <div class="editorial-split editorial-split-text-first">
          <div class="editorial-copy">
            <h3 class="sub-title">Self-drawing chart line</h3>
            <p class="prose">
              Line charts draw once when first seen, then stay still while you inspect points or drag a scenario slider.
            </p>
            <div class="motion-demo-controls">
              <button type="button" class="motion-replay-btn" data-motion-replay="drawn-chart">Play again</button>
            </div>
          </div>

          <figure class="diagram-figure" data-diagram="self-drawing-chart" data-motion-demo="drawn-chart" data-motion-playable="drawn-chart">
            ${drawnChartSvg}
            <figcaption class="diagram-caption">
              A sample savings line drawing itself once when first seen on the website; app charts draw once per visit in ${drawMs} milliseconds.
            </figcaption>
          </figure>
        </div>
      </div>
    </div>

    <div class="spread spread-subtle">
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

    <div class="spread">
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
