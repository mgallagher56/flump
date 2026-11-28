import { type BrandTokens, colorVar } from "../tokens";

export function renderCardMaterialLayersDiagram(_tokens: BrandTokens): string {
  return `<figure class="diagram-figure">
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

      <!-- Left: Soft glass card -->
      <rect x="20" y="18" width="308" height="264" rx="12" fill="${colorVar("surface.card")}" stroke="${colorVar("border.subtle")}"/>
      <text x="36" y="42" fill="${colorVar("text.primary")}" font-family="var(--font-heading)" font-size="14" font-weight="700">Soft glass card</text>
      <text x="36" y="58" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11">Neutral surface, top inner light and diagonal sheen</text>

      <!-- Layer 4: Shadow -->
      <rect x="52" y="206" width="180" height="50" rx="12" fill="${colorVar("text.primary")}" fill-opacity="0.1"/>
      <text x="242" y="236" fill="${colorVar("text.secondary")}" font-family="var(--font-mono)" font-size="10">shadows.glass</text>

      <!-- Layer 3: Fill + border -->
      <rect x="52" y="162" width="180" height="50" rx="12" fill="${colorVar("material.glass.fill")}" stroke="${colorVar("material.glass.border")}" stroke-width="1.5"/>
      <text x="242" y="186" fill="${colorVar("text.secondary")}" font-family="var(--font-mono)" font-size="10">material.glass.fill</text>
      <text x="242" y="199" fill="${colorVar("text.muted")}" font-family="var(--font-mono)" font-size="9.5">+ material.glass.border</text>

      <!-- Layer 2: Diagonal sheen -->
      <rect x="52" y="118" width="180" height="50" rx="12" fill="url(#mat-sheen)" stroke="${colorVar("border")}" stroke-dasharray="3 3"/>
      <text x="242" y="146" fill="${colorVar("text.secondary")}" font-family="var(--font-mono)" font-size="10">material.glass.sheen</text>

      <!-- Layer 1: Inner top light -->
      <rect x="52" y="74" width="180" height="50" rx="12" fill="${colorVar("surface.card")}" fill-opacity="0.55" stroke="${colorVar("border")}"/>
      <line x1="60" y1="76" x2="224" y2="76" stroke="${colorVar("primary")}" stroke-width="2" stroke-opacity="0.65"/>
      <text x="242" y="102" fill="${colorVar("text.secondary")}" font-family="var(--font-mono)" font-size="10">material.glass.light</text>

      <!-- Right: Paper document card -->
      <rect x="352" y="18" width="308" height="264" rx="12" fill="${colorVar("surface.card")}" stroke="${colorVar("border.subtle")}"/>
      <text x="368" y="42" fill="${colorVar("text.primary")}" font-family="var(--font-heading)" font-size="14" font-weight="700">Paper document card</text>
      <text x="368" y="58" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="11">Ruled paper fill, 1 px edge and Example tag</text>

      <!-- Layer 4: Paper shadow -->
      <rect x="384" y="206" width="180" height="50" rx="6" fill="${colorVar("text.primary")}" fill-opacity="0.14"/>
      <text x="574" y="236" fill="${colorVar("text.secondary")}" font-family="var(--font-mono)" font-size="10">shadows.paper</text>

      <!-- Layer 3: Paper fill + edge -->
      <rect x="384" y="162" width="180" height="50" rx="6" fill="${colorVar("material.paper.fill")}" stroke="${colorVar("material.paper.edge")}" stroke-width="1.5"/>
      <text x="574" y="186" fill="${colorVar("text.secondary")}" font-family="var(--font-mono)" font-size="10">material.paper.fill</text>
      <text x="574" y="199" fill="${colorVar("text.muted")}" font-family="var(--font-mono)" font-size="9.5">+ material.paper.edge</text>

      <!-- Layer 2: Ruled lines -->
      <rect x="384" y="118" width="180" height="50" rx="6" fill="url(#mat-paper-rules)" stroke="${colorVar("border")}" stroke-dasharray="3 3"/>
      <text x="574" y="146" fill="${colorVar("text.secondary")}" font-family="var(--font-mono)" font-size="10">material.paper.rule</text>

      <!-- Layer 1: Content + Example tag -->
      <rect x="384" y="74" width="180" height="50" rx="6" fill="${colorVar("material.paper.fill")}" stroke="${colorVar("material.paper.edge")}"/>
      <rect x="494" y="83" width="58" height="20" rx="10" fill="${colorVar("surface.sunken")}" stroke="${colorVar("border")}"/>
      <text x="523" y="97" text-anchor="middle" fill="${colorVar("text.secondary")}" font-family="var(--font-body)" font-size="10" font-weight="500">Example</text>
      <text x="396" y="102" fill="${colorVar("text.primary")}" font-family="var(--font-heading)" font-size="11" font-weight="600">Statement</text>
      <text x="574" y="102" fill="${colorVar("text.secondary")}" font-family="var(--font-body)" font-size="10">Real-text tag</text>
    </svg>
    <figcaption class="diagram-caption">
      Exploded material recipes from <code>Card.styles.ts</code>, <code>elevation.ts</code> and <code>Illustration.documents.ts</code>. Both materials stay neutral and carry no violet or rose.
    </figcaption>
  </figure>`;
}
