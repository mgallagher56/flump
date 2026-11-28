import { type BrandTokens, colorVar } from "../tokens";

export function renderOrbTonesDiagram(_tokens: BrandTokens): string {
  const tones = [
    {
      label: "Sky",
      role: "Primary orb highlight",
      cssVar: colorVar("orb.skyTeal.core"),
      cx: 96,
    },
    {
      label: "Teal",
      role: "Alternating bubble tone",
      cssVar: colorVar("orb.skyTeal.shade"),
      cx: 246,
    },
    {
      label: "Violet",
      role: "Secondary orb highlight",
      cssVar: colorVar("orb.violetRose.core"),
      cx: 414,
    },
    {
      label: "Rose",
      role: "Warm orb rim tone",
      cssVar: colorVar("orb.violetRose.shade"),
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
      return `
      <g>
        <ellipse cx="${t.cx}" cy="${cy + r + 14}" rx="${r * 0.85}" ry="8" fill="${t.cssVar}" fill-opacity="0.24"/>
        <circle cx="${t.cx}" cy="${cy}" r="${r}" fill="${colorVar("surface.card")}"/>
        <circle cx="${t.cx}" cy="${cy}" r="${r}" fill="url(#diag-orb-body-${i})"/>
        <circle cx="${t.cx}" cy="${cy}" r="${r}" fill="url(#diag-orb-caustic-${i})"/>
        <circle cx="${t.cx}" cy="${cy}" r="${r}" fill="url(#diag-orb-spec-${i})"/>
        <circle cx="${t.cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.cssVar}" stroke-opacity="0.55" stroke-width="1.25"/>
        <text x="${t.cx}" y="192" text-anchor="middle" fill="${colorVar("text.primary")}" font-family="var(--font-heading)" font-size="13" font-weight="600">${t.label}</text>
        <text x="${t.cx}" y="210" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="10.5">${t.role}</text>
      </g>`;
    })
    .join("");

  return `<figure class="diagram-figure" data-diagram="orb-tones">
    <svg viewBox="0 0 660 244" role="img" aria-labelledby="diag-orb-tones-title diag-orb-tones-desc">
      <title id="diag-orb-tones-title">The four orb tones</title>
      <desc id="diag-orb-tones-desc">Four glass orb spheres side by side: sky and teal on the left, violet and rose on the right.</desc>
      <defs>${defs}</defs>
      <rect x="1" y="1" width="658" height="242" rx="14" fill="${colorVar("surface.subtle")}" stroke="${colorVar("border")}" stroke-width="1"/>
      <rect x="18" y="18" width="302" height="210" rx="12" fill="${colorVar("surface.card")}" stroke="${colorVar("border.subtle")}"/>
      <rect x="340" y="18" width="302" height="210" rx="12" fill="${colorVar("surface.card")}" stroke="${colorVar("border.subtle")}"/>
      <text x="169" y="42" text-anchor="middle" fill="${colorVar("text.secondary")}" font-family="var(--font-body)" font-size="11" font-weight="600">Sky and teal pair</text>
      <text x="491" y="42" text-anchor="middle" fill="${colorVar("text.secondary")}" font-family="var(--font-body)" font-size="11" font-weight="600">Violet and rose pair</text>
      ${orbsMarkup}
    </svg>
    <figcaption class="diagram-caption">
      The four orb tones used on the marketing site and the three-bubble mark. Violet and rose stay strictly on orb-like elements, small area markers and the logo.
    </figcaption>
  </figure>`;
}
