import { type BrandTokens, colorVar } from "../tokens";

export function renderGlassOrbLightingDiagram(_tokens: BrandTokens): string {
  const tone = colorVar("orb.skyTeal.core");
  const lightTone = colorVar("logo.glint");

  return `<figure class="diagram-figure" data-diagram="glass-orb-lighting">
    <svg viewBox="0 0 700 240" role="img" aria-labelledby="diag-orb-lit-title diag-orb-lit-desc">
      <title id="diag-orb-lit-title">How a glass orb is lit</title>
      <desc id="diag-orb-lit-desc">The five layers of a glass orb: cast shadow, rim-tinted clear body, lower-right caustic, top-left edge highlight, top-left specular dot, and the composed orb.</desc>
      <defs>
        <radialGradient id="lit-body" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${tone}" stop-opacity="0.06"/>
          <stop offset="46%" stop-color="${tone}" stop-opacity="0.16"/>
          <stop offset="78%" stop-color="${tone}" stop-opacity="0.26"/>
          <stop offset="100%" stop-color="${tone}" stop-opacity="0.58"/>
        </radialGradient>
        <radialGradient id="lit-caustic" cx="66%" cy="78%" r="42%">
          <stop offset="0%" stop-color="${tone}" stop-opacity="0.46"/>
          <stop offset="100%" stop-color="${tone}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="lit-spec" cx="31%" cy="24%" r="20%">
          <stop offset="0%" stop-color="${lightTone}" stop-opacity="0.92"/>
          <stop offset="45%" stop-color="${lightTone}" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="${lightTone}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="lit-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${tone}" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="${tone}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect x="1" y="1" width="698" height="238" rx="14" fill="${colorVar("surface.subtle")}" stroke="${colorVar("border")}" stroke-width="1"/>

      <g transform="translate(64, 108)">
        <ellipse cx="0" cy="24" rx="34" ry="12" fill="url(#lit-shadow)"/>
        <circle cx="0" cy="0" r="34" fill="none" stroke="${colorVar("border")}" stroke-dasharray="3 3"/>
        <text x="0" y="64" text-anchor="middle" fill="${colorVar("text.primary")}" font-family="var(--font-body)" font-size="11" font-weight="600">1. Cast shadow</text>
        <text x="0" y="79" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="10">Own tone beneath</text>
      </g>

      <g transform="translate(172, 108)">
        <circle cx="0" cy="0" r="34" fill="${colorVar("surface.card")}"/>
        <circle cx="0" cy="0" r="34" fill="url(#lit-body)" stroke="${tone}" stroke-opacity="0.55" stroke-width="1"/>
        <text x="0" y="64" text-anchor="middle" fill="${colorVar("text.primary")}" font-family="var(--font-body)" font-size="11" font-weight="600">2. Clear body</text>
        <text x="0" y="79" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="10">Tinted toward rim</text>
      </g>

      <g transform="translate(280, 108)">
        <circle cx="0" cy="0" r="34" fill="${colorVar("surface.card")}" stroke="${colorVar("border")}"/>
        <circle cx="0" cy="0" r="34" fill="url(#lit-caustic)"/>
        <text x="0" y="64" text-anchor="middle" fill="${colorVar("text.primary")}" font-family="var(--font-body)" font-size="11" font-weight="600">3. Far caustic</text>
        <text x="0" y="79" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="10">Lower-right pool</text>
      </g>

      <g transform="translate(388, 108)">
        <circle cx="0" cy="0" r="34" fill="${colorVar("surface.card")}" stroke="${colorVar("border")}"/>
        <path d="M -27 -10 A 29 29 0 0 1 12 -26" fill="none" stroke="${tone}" stroke-width="2" stroke-linecap="round"/>
        <path d="M -25 -9 A 27 27 0 0 1 11 -24" fill="none" stroke="${lightTone}" stroke-width="1.5" stroke-linecap="round" stroke-opacity="0.7"/>
        <text x="0" y="64" text-anchor="middle" fill="${colorVar("text.primary")}" font-family="var(--font-body)" font-size="11" font-weight="600">4. Rim arc</text>
        <text x="0" y="79" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="10">Top-left edge light</text>
      </g>

      <g transform="translate(496, 108)">
        <circle cx="0" cy="0" r="34" fill="${colorVar("surface.card")}" stroke="${colorVar("border")}"/>
        <circle cx="0" cy="0" r="34" fill="url(#lit-spec)"/>
        <circle cx="-13" cy="-18" r="3" fill="${lightTone}" stroke="${colorVar("border.strong")}" stroke-width="0.6"/>
        <text x="0" y="64" text-anchor="middle" fill="${colorVar("text.primary")}" font-family="var(--font-body)" font-size="11" font-weight="600">5. Highlight</text>
        <text x="0" y="79" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="10">Crisp specular dot</text>
      </g>

      <text x="556" y="114" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-heading)" font-size="18" font-weight="700">=</text>

      <g transform="translate(624, 108)">
        <ellipse cx="0" cy="24" rx="38" ry="12" fill="url(#lit-shadow)"/>
        <circle cx="0" cy="0" r="38" fill="${colorVar("surface.card")}"/>
        <circle cx="0" cy="0" r="38" fill="url(#lit-body)"/>
        <circle cx="0" cy="0" r="38" fill="url(#lit-caustic)"/>
        <circle cx="0" cy="0" r="38" fill="url(#lit-spec)"/>
        <path d="M -30 -11 A 32 32 0 0 1 13 -29" fill="none" stroke="${lightTone}" stroke-opacity="0.6" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="0" cy="0" r="38" fill="none" stroke="${tone}" stroke-opacity="0.55" stroke-width="1"/>
        <text x="0" y="64" text-anchor="middle" fill="${colorVar("text.primary")}" font-family="var(--font-heading)" font-size="12" font-weight="700">Glass orb</text>
        <text x="0" y="79" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="10">Layered CSS sphere</text>
      </g>
    </svg>
    <figcaption class="diagram-caption">
      Five layered gradients and shadows over a clear sphere build depth in light and dark themes without heavy artwork.
    </figcaption>
  </figure>`;
}
