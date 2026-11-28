import { type BrandTokens, colorVar } from "../tokens";

export function renderOrbTonesDiagram(tokens: BrandTokens): string {
  const { light, dark } = tokens.native;
  const tones = [
    {
      label: "Sky",
      set: "Set A: Sky and teal",
      token: "orb.skyTeal.core" as const,
      cssVar: colorVar("orb.skyTeal.core"),
      rimVar: colorVar("orb.skyTeal.rim"),
      cx: 96,
    },
    {
      label: "Teal",
      set: "Set A: Sky and teal",
      token: "orb.skyTeal.shade" as const,
      cssVar: colorVar("orb.skyTeal.shade"),
      rimVar: colorVar("orb.skyTeal.rim"),
      cx: 246,
    },
    {
      label: "Violet",
      set: "Set B: Violet and rose",
      token: "orb.violetRose.core" as const,
      cssVar: colorVar("orb.violetRose.core"),
      rimVar: colorVar("orb.violetRose.rim"),
      cx: 414,
    },
    {
      label: "Rose",
      set: "Set B: Violet and rose",
      token: "orb.violetRose.shade" as const,
      cssVar: colorVar("orb.violetRose.shade"),
      rimVar: colorVar("orb.violetRose.rim"),
      cx: 564,
    },
  ];

  const defs = tones
    .map(
      (t, i) => `
      <radialGradient id="diag-orb-body-${i}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${t.cssVar}" stop-opacity="0.14"/>
        <stop offset="55%" stop-color="${t.cssVar}" stop-opacity="0.34"/>
        <stop offset="100%" stop-color="${t.cssVar}" stop-opacity="0.78"/>
      </radialGradient>
      <radialGradient id="diag-orb-caustic-${i}" cx="66%" cy="78%" r="44%">
        <stop offset="0%" stop-color="${t.cssVar}" stop-opacity="0.52"/>
        <stop offset="100%" stop-color="${t.cssVar}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="diag-orb-spec-${i}" cx="31%" cy="24%" r="22%">
        <stop offset="0%" stop-color="${colorVar("logo.glint")}" stop-opacity="0.92"/>
        <stop offset="45%" stop-color="${colorVar("logo.glint")}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="${colorVar("logo.glint")}" stop-opacity="0"/>
      </radialGradient>`,
    )
    .join("");

  const orbsMarkup = tones
    .map((t, i) => {
      const cy = 112;
      const r = 44;
      const lightHex = light.colors[t.token];
      const darkHex = dark.colors[t.token];
      return `
      <g>
        <ellipse cx="${t.cx}" cy="${cy + r + 14}" rx="${r * 0.85}" ry="8" fill="${t.cssVar}" fill-opacity="0.24"/>
        <circle cx="${t.cx}" cy="${cy}" r="${r}" fill="${colorVar("surface.card")}"/>
        <circle cx="${t.cx}" cy="${cy}" r="${r}" fill="url(#diag-orb-body-${i})"/>
        <circle cx="${t.cx}" cy="${cy}" r="${r}" fill="url(#diag-orb-caustic-${i})"/>
        <circle cx="${t.cx}" cy="${cy}" r="${r}" fill="url(#diag-orb-spec-${i})"/>
        <circle cx="${t.cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.cssVar}" stroke-opacity="0.55" stroke-width="1.25"/>
        <text x="${t.cx}" y="192" text-anchor="middle" fill="${colorVar("text.primary")}" font-family="var(--font-heading)" font-size="13" font-weight="600">${t.label}</text>
        <text x="${t.cx}" y="209" text-anchor="middle" fill="${colorVar("primary")}" font-family="var(--font-mono)" font-size="10.5">${t.token}</text>
        <text x="${t.cx}" y="225" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-mono)" font-size="10" style="font-variant-numeric:tabular-nums">L ${lightHex} / D ${darkHex}</text>
      </g>`;
    })
    .join("");

  return `<figure class="diagram-figure">
    <svg viewBox="0 0 660 250" role="img" aria-labelledby="diag-orb-tones-title diag-orb-tones-desc">
      <title id="diag-orb-tones-title">The four orb tones</title>
      <desc id="diag-orb-tones-desc">Four glass orb spheres side by side: sky, teal, violet and rose, each named by its token.</desc>
      <defs>${defs}</defs>
      <rect x="1" y="1" width="658" height="248" rx="14" fill="${colorVar("surface.subtle")}" stroke="${colorVar("border")}" stroke-width="1"/>
      <rect x="18" y="18" width="302" height="218" rx="12" fill="${colorVar("surface.card")}" stroke="${colorVar("border.subtle")}"/>
      <rect x="340" y="18" width="302" height="218" rx="12" fill="${colorVar("surface.card")}" stroke="${colorVar("border.subtle")}"/>
      <text x="169" y="42" text-anchor="middle" fill="${colorVar("text.secondary")}" font-family="var(--font-body)" font-size="11" font-weight="600">Set A: orb.skyTeal</text>
      <text x="491" y="42" text-anchor="middle" fill="${colorVar("text.secondary")}" font-family="var(--font-body)" font-size="11" font-weight="600">Set B: orb.violetRose</text>
      ${orbsMarkup}
    </svg>
    <figcaption class="diagram-caption">
      The four orb tones from <code>orb.skyTeal</code> and <code>orb.violetRose</code>. Violet and rose are restricted to orb-like elements and the allow-listed marks under rule MC1.
    </figcaption>
  </figure>`;
}
