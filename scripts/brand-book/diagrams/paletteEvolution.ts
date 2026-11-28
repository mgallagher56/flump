import type { ColorKey } from "../../../packages/tokens/src/native.generated";
import { type BrandTokens, colorVar } from "../tokens";

interface PaletteComparisonRow {
  key: ColorKey;
  oldLight: string;
  oldDark: string;
}

// Historical Direction C token values read verbatim from commit f80ed2fc6 (20 November 2026)
// in packages/tokens/src/native.generated.ts.
const DIRECTION_C_ROWS: ReadonlyArray<PaletteComparisonRow> = [
  { key: "surface.canvas", oldLight: "#f5f1ea", oldDark: "#1d1a17" },
  { key: "surface.card", oldLight: "#fffdf9", oldDark: "#272320" },
  { key: "surface.hero", oldLight: "#12483f", oldDark: "#1b5448" },
  { key: "surface.contrast", oldLight: "#22302c", oldDark: "#3a352f" },
  { key: "text.primary", oldLight: "#2b2620", oldDark: "#f4efe7" },
  { key: "primary", oldLight: "#0f6b5e", oldDark: "#6fd0ba" },
  { key: "primary.solid", oldLight: "#0f6b5e", oldDark: "#0f6b5e" },
  { key: "accent", oldLight: "#7a3f66", oldDark: "#dba6c9" },
  { key: "border", oldLight: "#dcd4c8", oldDark: "#3b362f" },
];

export function renderPaletteEvolutionDiagram(tokens: BrandTokens): string {
  const rowH = 34;
  const topPad = 56;
  const svgH = topPad + DIRECTION_C_ROWS.length * rowH + 20;

  const rowsMarkup = DIRECTION_C_ROWS.map((row, idx) => {
    const y = topPad + idx * rowH;
    const newLight = tokens.native.light.colors[row.key];
    const newDark = tokens.native.dark.colors[row.key];

    return `
      <g>
        <line x1="16" y1="${y - 4}" x2="664" y2="${y - 4}" stroke="${colorVar("border.subtle")}" stroke-width="1"/>
        <text x="20" y="${y + 15}" fill="${colorVar("text.primary")}" font-family="var(--font-mono)" font-size="10.5">${row.key}</text>

        <rect x="148" y="${y + 2}" width="18" height="18" rx="4" fill="${row.oldLight}" stroke="${colorVar("border.strong")}" stroke-width="1"/>
        <text x="172" y="${y + 15}" fill="${colorVar("text.secondary")}" font-family="var(--font-mono)" font-size="10" style="font-variant-numeric:tabular-nums">L ${row.oldLight}</text>

        <rect x="254" y="${y + 2}" width="18" height="18" rx="4" fill="${row.oldDark}" stroke="${colorVar("border.strong")}" stroke-width="1"/>
        <text x="278" y="${y + 15}" fill="${colorVar("text.secondary")}" font-family="var(--font-mono)" font-size="10" style="font-variant-numeric:tabular-nums">D ${row.oldDark}</text>

        <line x1="368" y1="${y + 11}" x2="392" y2="${y + 11}" stroke="${colorVar("border.strong")}" stroke-width="1.25"/>
        <polyline points="387,7 393,11 387,15" fill="none" stroke="${colorVar("border.strong")}" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>

        <rect x="412" y="${y + 2}" width="18" height="18" rx="4" fill="${newLight}" stroke="${colorVar("border.strong")}" stroke-width="1"/>
        <text x="436" y="${y + 15}" fill="${colorVar("text.primary")}" font-family="var(--font-mono)" font-size="10" font-weight="600" style="font-variant-numeric:tabular-nums">L ${newLight}</text>

        <rect x="520" y="${y + 2}" width="18" height="18" rx="4" fill="${newDark}" stroke="${colorVar("border.strong")}" stroke-width="1"/>
        <text x="544" y="${y + 15}" fill="${colorVar("text.primary")}" font-family="var(--font-mono)" font-size="10" font-weight="600" style="font-variant-numeric:tabular-nums">D ${newDark}</text>
      </g>`;
  }).join("");

  return `<figure class="diagram-figure">
    <svg viewBox="0 0 680 ${svgH}" role="img" aria-labelledby="diag-pal-evol-title diag-pal-evol-desc">
      <title id="diag-pal-evol-title">Then and now: Direction C compared with Midnight and Mint</title>
      <desc id="diag-pal-evol-desc">Comparison of nine core colour tokens in light and dark mode between Direction C at commit f80ed2fc6 and Midnight and Mint in packages/tokens/src.</desc>
      <rect x="1" y="1" width="678" height="${svgH - 2}" rx="14" fill="${colorVar("surface.card")}" stroke="${colorVar("border")}"/>
      <text x="20" y="26" fill="${colorVar("text.primary")}" font-family="var(--font-heading)" font-size="12" font-weight="700">Token</text>
      <text x="148" y="26" fill="${colorVar("text.secondary")}" font-family="var(--font-heading)" font-size="12" font-weight="700">Then: Direction C (f80ed2fc6)</text>
      <text x="412" y="26" fill="${colorVar("primary")}" font-family="var(--font-heading)" font-size="12" font-weight="700">Now: Midnight and Mint</text>
      <text x="148" y="42" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="10">20 Nov 2026 (L light, D dark)</text>
      <text x="412" y="42" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="10">Live values from packages/tokens/src</text>
      ${rowsMarkup}
    </svg>
    <figcaption class="diagram-caption">
      Palette comparison between Direction C (commit <code>f80ed2fc6</code>, 20 November 2026) and the current Midnight and Mint tokens. Cream and warm-charcoal grounds shifted to pale mint and cool charcoal; <code>surface.hero</code> in light moved from deep teal-green to solid mint; <code>primary.solid</code> in light moved from teal to charcoal; and light <code>accent</code> moved from Damson to blue-teal.
    </figcaption>
  </figure>`;
}
