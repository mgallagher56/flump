import { type BrandTokens, colorVar } from "../tokens";

export function renderChartAnatomyDiagram(_tokens: BrandTokens): string {
  return `<figure class="diagram-figure" data-diagram="chart-anatomy">
    <svg viewBox="0 0 680 270" role="img" aria-labelledby="diag-chart-title diag-chart-desc">
      <title id="diag-chart-title">Chart anatomy and series rules</title>
      <desc id="diag-chart-desc">Sample chart showing gridlines, zero line, primary series, debt series in apricot, dashed estimate with range band, direct end labels and three-letter months.</desc>
      <rect x="1" y="1" width="678" height="268" rx="14" fill="${colorVar("surface.card")}" stroke="${colorVar("border")}"/>

      <text x="24" y="30" fill="${colorVar("text.primary")}" font-family="var(--font-heading)" font-size="13" font-weight="600">Net worth and debt illustration</text>
      <rect x="592" y="14" width="64" height="22" rx="11" fill="${colorVar("surface.sunken")}" stroke="${colorVar("border")}"/>
      <text x="624" y="29" text-anchor="middle" fill="${colorVar("text.secondary")}" font-family="var(--font-body)" font-size="11" font-weight="500">Example</text>

      <line x1="76" y1="62" x2="532" y2="62" stroke="${colorVar("chart.grid")}" stroke-width="1"/>
      <line x1="76" y1="102" x2="532" y2="102" stroke="${colorVar("chart.grid")}" stroke-width="1"/>
      <line x1="76" y1="142" x2="532" y2="142" stroke="${colorVar("chart.grid")}" stroke-width="1"/>
      <line x1="76" y1="182" x2="532" y2="182" stroke="${colorVar("chart.baseline")}" stroke-width="1.25"/>
      <line x1="76" y1="212" x2="532" y2="212" stroke="${colorVar("chart.grid")}" stroke-width="1"/>

      <text x="66" y="66" text-anchor="end" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11" style="font-variant-numeric:tabular-nums">£150k</text>
      <text x="66" y="106" text-anchor="end" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11" style="font-variant-numeric:tabular-nums">£100k</text>
      <text x="66" y="146" text-anchor="end" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11" style="font-variant-numeric:tabular-nums">£50k</text>
      <text x="66" y="186" text-anchor="end" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11" style="font-variant-numeric:tabular-nums">£0</text>

      <polygon points="350,118 441,94 532,68 532,110 441,124 350,132" fill="${colorVar("chart.band")}"/>

      <polyline points="76,154 167,144 258,134 350,124" fill="none" stroke="${colorVar("chart.primary")}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="350" cy="124" r="4" fill="${colorVar("chart.primary")}"/>

      <polyline points="350,124 441,108 532,90" fill="none" stroke="${colorVar("chart.projection")}" stroke-width="2.5" stroke-dasharray="6 4" stroke-linecap="round"/>
      <circle cx="532" cy="90" r="4" fill="${colorVar("chart.projection")}"/>

      <polyline points="76,170 167,172 258,175 350,177 441,179 532,180" fill="none" stroke="${colorVar("chart.debt")}" stroke-width="2.5" stroke-linecap="round"/>
      <rect x="528" y="176" width="8" height="8" rx="1.5" fill="${colorVar("chart.debt")}"/>

      <text x="544" y="74" fill="${colorVar("primary")}" font-family="var(--font-body)" font-size="10.5">Estimated range</text>
      <text x="544" y="94" fill="${colorVar("chart.projection")}" font-family="var(--font-body)" font-size="11" font-weight="600">Estimate (dashed)</text>
      <text x="356" y="114" fill="${colorVar("chart.primary")}" font-family="var(--font-body)" font-size="11" font-weight="600">Net worth</text>
      <text x="544" y="184" fill="${colorVar("chart.debt")}" font-family="var(--font-body)" font-size="11" font-weight="600">Debt (apricot)</text>
      <text x="544" y="201" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="10">Zero line (£0)</text>

      <text x="76" y="232" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11">Sep</text>
      <text x="167" y="232" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11">Oct</text>
      <text x="258" y="232" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11">Nov</text>
      <text x="350" y="232" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11">Dec</text>
      <text x="441" y="232" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11">Jan</text>
      <text x="532" y="232" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11">Feb</text>

      <text x="24" y="254" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11">Assumes 5% growth a year. Figures are illustrative.</text>
    </svg>
    <figcaption class="diagram-caption">
      Consistent entity colours, dashed estimates with range shading, direct line labels and three-letter months keep charts clear at a glance.
    </figcaption>
  </figure>`;
}
