import { type BrandTokens, colorVar } from "../tokens";

export function renderCardMaterialLayersDiagram(_tokens: BrandTokens): string {
  return `<figure class="diagram-figure" data-diagram="card-material-layers">
    <svg viewBox="0 0 680 300" role="img" aria-labelledby="diag-mat-title diag-mat-desc">
      <title id="diag-mat-title">Card material layers</title>
      <desc id="diag-mat-desc">Exploded layer stack for the soft glass card on the left and the paper document card on the right.</desc>
      <defs>
        <linearGradient id="mat-sheen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${colorVar("logo.glint")}" stop-opacity="0.22"/>
          <stop offset="42%" stop-color="${colorVar("logo.glint")}" stop-opacity="0"/>
        </linearGradient>
        <pattern id="mat-paper-rules" width="10" height="8" patternUnits="userSpaceOnUse">
          <line x1="0" y1="7" x2="10" y2="7" stroke="${colorVar("text.primary")}" stroke-opacity="0.08" stroke-width="1"/>
        </pattern>
      </defs>
      <rect x="1" y="1" width="678" height="298" rx="14" fill="${colorVar("surface.subtle")}" stroke="${colorVar("border")}"/>

      <rect x="20" y="18" width="308" height="264" rx="12" fill="${colorVar("surface.card")}" stroke="${colorVar("border.subtle")}"/>
      <text x="36" y="42" fill="${colorVar("text.primary")}" font-family="var(--font-heading)" font-size="14" font-weight="700">Soft glass card</text>
      <text x="36" y="58" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11">Neutral surface, top inner light and diagonal sheen</text>

      <rect x="52" y="206" width="160" height="50" rx="12" fill="${colorVar("text.primary")}" fill-opacity="0.1"/>
      <text x="224" y="235" fill="${colorVar("text.secondary")}" font-family="var(--font-body)" font-size="10.5">Soft drop shadow</text>

      <rect x="52" y="162" width="160" height="50" rx="12" fill="${colorVar("material.glass.fill")}" stroke="${colorVar("material.glass.border")}" stroke-width="1.5"/>
      <text x="224" y="191" fill="${colorVar("text.secondary")}" font-family="var(--font-body)" font-size="10.5">Neutral fill and edge</text>

      <rect x="52" y="118" width="160" height="50" rx="12" fill="url(#mat-sheen)" stroke="${colorVar("border")}" stroke-dasharray="3 3"/>
      <text x="224" y="147" fill="${colorVar("text.secondary")}" font-family="var(--font-body)" font-size="10.5">Diagonal sheen</text>

      <rect x="52" y="74" width="160" height="50" rx="12" fill="${colorVar("surface.card")}" fill-opacity="0.55" stroke="${colorVar("border")}"/>
      <line x1="60" y1="76" x2="204" y2="76" stroke="${colorVar("primary")}" stroke-width="2" stroke-opacity="0.65"/>
      <text x="224" y="103" fill="${colorVar("text.secondary")}" font-family="var(--font-body)" font-size="10.5">Top inner light</text>

      <rect x="352" y="18" width="308" height="264" rx="12" fill="${colorVar("surface.card")}" stroke="${colorVar("border.subtle")}"/>
      <text x="368" y="42" fill="${colorVar("text.primary")}" font-family="var(--font-heading)" font-size="14" font-weight="700">Paper document card</text>
      <text x="368" y="58" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11">Ruled paper fill, crisp edge and Example tag</text>

      <rect x="384" y="206" width="160" height="50" rx="6" fill="${colorVar("text.primary")}" fill-opacity="0.14"/>
      <text x="556" y="235" fill="${colorVar("text.secondary")}" font-family="var(--font-body)" font-size="10.5">Paper shadow</text>

      <rect x="384" y="162" width="160" height="50" rx="6" fill="${colorVar("material.paper.fill")}" stroke="${colorVar("material.paper.edge")}" stroke-width="1.5"/>
      <text x="556" y="191" fill="${colorVar("text.secondary")}" font-family="var(--font-body)" font-size="10.5">Paper fill and edge</text>

      <rect x="384" y="118" width="160" height="50" rx="6" fill="url(#mat-paper-rules)" stroke="${colorVar("border")}" stroke-dasharray="3 3"/>
      <text x="556" y="147" fill="${colorVar("text.secondary")}" font-family="var(--font-body)" font-size="10.5">Faint ruled lines</text>

      <rect x="384" y="74" width="160" height="50" rx="6" fill="${colorVar("material.paper.fill")}" stroke="${colorVar("material.paper.edge")}"/>
      <rect x="478" y="83" width="56" height="20" rx="10" fill="${colorVar("surface.sunken")}" stroke="${colorVar("border")}"/>
      <text x="506" y="97" text-anchor="middle" fill="${colorVar("text.secondary")}" font-family="var(--font-body)" font-size="10" font-weight="500">Example</text>
      <text x="396" y="102" fill="${colorVar("text.primary")}" font-family="var(--font-heading)" font-size="11" font-weight="600">Statement</text>
      <text x="556" y="103" fill="${colorVar("text.secondary")}" font-family="var(--font-body)" font-size="10.5">Real-text tag</text>
    </svg>
    <figcaption class="diagram-caption">
      Both card materials stay completely neutral so text keeps strong contrast in light and dark themes.
    </figcaption>
  </figure>`;
}
