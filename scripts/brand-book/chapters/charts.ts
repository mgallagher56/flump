import type { ColorKey } from "../../../packages/tokens/src/native.generated";
import { renderChartAnatomyDiagram } from "../diagrams/chartAnatomy";
import { renderColorSwatch, renderSourceCite } from "../renderHelpers";
import type { BrandTokens } from "../tokens";

export function renderChartsChapter(tokens: BrandTokens): string {
  const chartKeys: ReadonlyArray<readonly [ColorKey, string]> = [
    ["chart.primary", "Main line: net worth, mortgage, pension (teal light, mint dark)"],
    ["chart.wealth", "Savings"],
    ["chart.debt", "What you owe (apricot, never red)"],
    ["chart.warning", "Chart warning series (ochre)"],
    ["chart.accentPurple", "Accent purple series"],
    ["chart.accentCyan", "Accent cyan series"],
    ["chart.accent", "One dashed and directly labelled accent series at most per chart"],
    ["chart.series1", "Entity series 1 (matches chart.primary)"],
    ["chart.series2", "Entity series 2 (matches chart.wealth)"],
    ["chart.series3", "Entity series 3 (matches chart.debt)"],
    ["chart.series4", "Entity series 4 (purple)"],
    ["chart.series5", "Entity series 5 (rose)"],
    ["chart.series6", "Entity series 6 (sky / cyan)"],
    ["chart.series7", "Entity series 7 (olive-gold)"],
    ["chart.series8", "Entity series 8 (slate-grey)"],
    ["chart.projection", "Forecast lines (always dashed)"],
    ["chart.band", "Confidence range fill behind forecast lines (never a line)"],
    ["chart.baseline", "Zero line, targets, reference lines"],
    ["chart.grid", "Gridlines (8% ink in light, 8% paper in dark)"],
  ];

  return `<section class="chapter" id="charts">
    <div class="chapter-head">
      <span class="chapter-kicker">Chapter 09</span>
      <h2 class="chapter-title">Charts</h2>
    </div>

    <p class="prose">
      Chart colours come only from <code>chart.*</code> via <code>chartColor()</code> and <code>seriesColor()</code> (Rule CH1). Colour identifies an entity, never an outcome (CH2): an account keeps its assigned colour across views, and liabilities use apricot (<code>chart.debt</code>), never red.
    </p>

    ${renderChartAnatomyDiagram(tokens)}

    <h3 class="sub-title">Chart rules</h3>
    <div class="grid-2">
      <article class="card">
        <h4 class="card-title">Structure and accessibility</h4>
        <ul class="plain-list">
          <li><strong>C1:</strong> Every chart is a <code>ChartFigure</code> with a takeaway title, a visible one-sentence summary (at most 2 figures) and a "Show data" table.</li>
          <li><strong>C2:</strong> Choose form by question: line for change over time, sorted horizontal bars for parts of a whole or ranking, progress bar against a limit. Donuts hold at most 5 slices including "Other" (<code>capSeriesWithOther</code>).</li>
          <li><strong>C3 to C4:</strong> Label up to 3 series directly at line end; legend for 4. Never rely on colour alone: pair series with a dash, marker or direct label.</li>
          <li><strong>C8 to C9:</strong> Tap or keyboard focus selects a point with a fixed readout; arrow keys step through points. Animation respects <code>useChartAnimation</code> (off under reduced motion and while dragging a slider).</li>
        </ul>
      </article>

      <article class="card">
        <h4 class="card-title">Axes, estimates and ticks</h4>
        <ul class="plain-list">
          <li><strong>C5:</strong> Forecasts are dashed (<code>chart.projection</code>), state assumptions in a caption beneath, and forecasts over 1 year show a range fill (<code>chart.band</code>) with low and high pound values in text.</li>
          <li><strong>C6 to C7:</strong> Bar axes start at zero; no log scales or second y-axis. At most 6 x-axis ticks; years as "2030" (never "Year 5"); short months always three letters ("Sep", never "Sept").</li>
          <li><strong>CH5:</strong> Axis, legend and tooltip figures use tabular numerals and <code>formatAxisCurrency()</code>. Unknown values show as "Not set", never plotted as zero.</li>
          <li><strong>C12:</strong> Hover tooltips use <code>ChartTooltipContent</code> with dashed <code>chart.baseline</code> line cursor or soft <code>chart.grid</code> bar band.</li>
        </ul>
      </article>
    </div>

    <h3 class="sub-title">Chart palette tokens</h3>
    <div class="swatch-grid">
      ${chartKeys.map(([k, n]) => renderColorSwatch(tokens, k, n)).join("")}
    </div>

    ${renderSourceCite("STYLE-GUIDE 10; UX-GUIDELINES 8; docs/design/data-viz.md")}
  </section>`;
}
