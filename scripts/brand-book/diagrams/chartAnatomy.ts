import { type BrandTokens, colorVar } from "../tokens";

export function renderChartAnatomyDiagram(_tokens: BrandTokens): string {
  return `<figure class="diagram-figure">
    <svg viewBox="0 0 680 270" role="img" aria-labelledby="diag-chart-title diag-chart-desc">
      <title id="diag-chart-title">Chart anatomy and series rules</title>
      <desc id="diag-chart-desc">Sample chart showing gridlines, baseline, primary series, debt series in apricot, dashed projection with confidence band, direct end labels and three-letter months.</desc>
      <rect x="1" y="1" width="678" height="268" rx="14" fill="${colorVar("surface.card")}" stroke="${colorVar("border")}"/>

      <!-- Header and Example tag -->
      <text x="24" y="30" fill="${colorVar("text.primary")}" font-family="var(--font-heading)" font-size="13" font-weight="600">Net worth and debt illustration</text>
      <rect x="592" y="14" width="64" height="22" rx="11" fill="${colorVar("surface.sunken")}" stroke="${colorVar("border")}"/>
      <text x="624" y="29" text-anchor="middle" fill="${colorVar("text.secondary")}" font-family="var(--font-body)" font-size="11" font-weight="500">Example</text>

      <!-- Gridlines (chart.grid) -->
      <line x1="76" y1="62" x2="540" y2="62" stroke="${colorVar("chart.grid")}" stroke-width="1"/>
      <line x1="76" y1="102" x2="540" y2="102" stroke="${colorVar("chart.grid")}" stroke-width="1"/>
      <line x1="76" y1="142" x2="540" y2="142" stroke="${colorVar("chart.grid")}" stroke-width="1"/>
      <line x1="76" y1="182" x2="540" y2="182" stroke="${colorVar("chart.baseline")}" stroke-width="1.25"/>
      <line x1="76" y1="212" x2="540" y2="212" stroke="${colorVar("chart.grid")}" stroke-width="1"/>

      <!-- Y axis labels (formatAxisCurrency style) -->
      <text x="66" y="66" text-anchor="end" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11" style="font-variant-numeric:tabular-nums">£150k</text>
      <text x="66" y="106" text-anchor="end" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11" style="font-variant-numeric:tabular-nums">£100k</text>
      <text x="66" y="146" text-anchor="end" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11" style="font-variant-numeric:tabular-nums">£50k</text>
      <text x="66" y="186" text-anchor="end" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11" style="font-variant-numeric:tabular-nums">£0</text>

      <!-- Confidence band (chart.band) -->
      <polygon points="354,118 447,94 540,68 540,110 447,124 354,132" fill="${colorVar("chart.band")}"/>

      <!-- Primary line (chart.primary) -->
      <polyline points="76,154 169,144 262,134 354,124" fill="none" stroke="${colorVar("chart.primary")}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="354" cy="124" r="4" fill="${colorVar("chart.primary")}"/>

      <!-- Dashed projection line (chart.projection) -->
      <polyline points="354,124 447,108 540,90" fill="none" stroke="${colorVar("chart.projection")}" stroke-width="2.5" stroke-dasharray="6 4" stroke-linecap="round"/>
      <circle cx="540" cy="90" r="4" fill="${colorVar("chart.projection")}"/>

      <!-- Debt line in apricot (chart.debt) -->
      <polyline points="76,170 169,172 262,175 354,177 447,179 540,180" fill="none" stroke="${colorVar("chart.debt")}" stroke-width="2.5" stroke-linecap="round"/>
      <rect x="536" y="176" width="8" height="8" rx="1.5" fill="${colorVar("chart.debt")}"/>

      <!-- Direct end labels -->
      <text x="550" y="94" fill="${colorVar("chart.projection")}" font-family="var(--font-body)" font-size="11" font-weight="600">Estimate (dashed)</text>
      <text x="550" y="75" fill="${colorVar("primary")}" font-family="var(--font-body)" font-size="10">Range (chart.band)</text>
      <text x="360" y="114" fill="${colorVar("chart.primary")}" font-family="var(--font-body)" font-size="11" font-weight="600">Net worth</text>
      <text x="550" y="184" fill="${colorVar("chart.debt")}" font-family="var(--font-body)" font-size="11" font-weight="600">Debt (apricot)</text>
      <text x="550" y="200" fill="${colorVar("text.muted")}" font-family="var(--font-mono)" font-size="10">chart.baseline (£0)</text>

      <!-- X axis ticks: 3-letter months (Sep, not Sept) -->
      <text x="76" y="232" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11">Sep</text>
      <text x="169" y="232" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11">Oct</text>
      <text x="262" y="232" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11">Nov</text>
      <text x="354" y="232" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11">Dec</text>
      <text x="447" y="232" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11">Jan</text>
      <text x="540" y="232" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11">Feb</text>

      <text x="24" y="254" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11">Assumes 5% annual growth. Figures are illustrative.</text>
    </svg>
    <figcaption class="diagram-caption">
      Anatomy from <code>docs/design/data-viz.md</code> and <code>STYLE-GUIDE.md</code> section 10: entity colours, dashed forecasts, <code>chart.band</code> range fill, direct labels and three-letter months.
    </figcaption>
  </figure>`;
}
