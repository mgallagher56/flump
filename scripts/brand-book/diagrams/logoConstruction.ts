import { type BrandTokens, colorVar } from "../tokens";

export function renderLogoConstructionDiagram(tokens: BrandTokens): string {
  const { orbs, floor, floorLayout } = tokens.logo;
  const f = floorLayout(floor);

  const offset = 150;
  const markBox = 200;
  const clearSpace = markBox * 0.5;
  const totalW = markBox + clearSpace * 2 + 120;
  const totalH = markBox + clearSpace * 2;
  const ox = offset;
  const oy = clearSpace;

  const toneColor = (tone: "teal" | "sky" | "violet" | "rose") => colorVar(`logo.${tone}`);

  const circlesAndGuides = orbs
    .map((orb, idx) => {
      const cx = ox + orb.cx;
      const cy = oy + orb.cy;
      const col = toneColor(orb.tone);
      const labelY = idx === 0 ? cy - 6 : idx === 1 ? cy - 6 : cy + 4;
      const labelX = idx === 2 ? ox - 14 : ox + markBox + 14;
      const anchor = idx === 2 ? "end" : "start";
      const lineX = idx === 2 ? cx - orb.r : cx + orb.r;
      return `
      <circle cx="${cx}" cy="${cy}" r="${orb.r}" fill="${col}" fill-opacity="0.14" stroke="${col}" stroke-width="2"/>
      <line x1="${cx - 6}" y1="${cy}" x2="${cx + 6}" y2="${cy}" stroke="${colorVar("text.primary")}" stroke-width="1.5"/>
      <line x1="${cx}" y1="${cy - 6}" x2="${cx}" y2="${cy + 6}" stroke="${colorVar("text.primary")}" stroke-width="1.5"/>
      <line x1="${cx}" y1="${cy}" x2="${lineX}" y2="${cy}" stroke="${col}" stroke-width="1.2" stroke-dasharray="3 3"/>
      <line x1="${lineX}" y1="${cy}" x2="${labelX + (idx === 2 ? 6 : -6)}" y2="${labelY}" stroke="${colorVar("border.strong")}" stroke-width="1"/>
      <text x="${labelX}" y="${labelY + 4}" text-anchor="${anchor}" fill="${colorVar("text.primary")}" font-family="var(--font-body)" font-size="11" font-weight="600" style="font-variant-numeric:tabular-nums">Bubble ${idx + 1} (${orb.tone}, r ${orb.r})</text>
      <text x="${labelX}" y="${labelY + 18}" text-anchor="${anchor}" fill="${colorVar("text.muted")}" font-family="var(--font-mono)" font-size="10" style="font-variant-numeric:tabular-nums">cx ${orb.cx}, cy ${orb.cy}, light ${orb.light}</text>`;
    })
    .join("");

  return `<figure class="diagram-figure">
    <svg viewBox="0 0 ${totalW} ${totalH}" role="img" aria-labelledby="diag-logo-title diag-logo-desc">
      <title id="diag-logo-title">Logo construction and clear space</title>
      <desc id="diag-logo-desc">Geometry of the K2 mark in a 200 by 200 view box with three glass bubbles, floor shadow and half-width clear space.</desc>
      <rect x="1" y="1" width="${totalW - 2}" height="${totalH - 2}" rx="14" fill="${colorVar("surface.subtle")}" stroke="${colorVar("border")}" stroke-width="1"/>
      <rect x="${ox - clearSpace}" y="${oy - clearSpace}" width="${markBox + clearSpace * 2}" height="${markBox + clearSpace * 2}" rx="8" fill="none" stroke="${colorVar("border.strong")}" stroke-width="1.25" stroke-dasharray="6 4"/>
      <rect x="${ox}" y="${oy}" width="${markBox}" height="${markBox}" fill="${colorVar("surface.card")}" stroke="${colorVar("primary")}" stroke-width="1.5"/>
      <text x="${ox + 6}" y="${oy + 14}" fill="${colorVar("primary")}" font-family="var(--font-mono)" font-size="10" font-weight="600">200 x 200 view box</text>

      <line x1="${ox - clearSpace}" y1="${oy + markBox / 2}" x2="${ox}" y2="${oy + markBox / 2}" stroke="${colorVar("primary")}" stroke-width="1.2"/>
      <text x="${ox - clearSpace / 2}" y="${oy + markBox / 2 - 6}" text-anchor="middle" fill="${colorVar("primary")}" font-family="var(--font-body)" font-size="10" font-weight="600">0.5w clear</text>
      <line x1="${ox + markBox}" y1="${oy + markBox / 2}" x2="${ox + markBox + clearSpace}" y2="${oy + markBox / 2}" stroke="${colorVar("primary")}" stroke-width="1.2"/>
      <text x="${ox + markBox + clearSpace / 2}" y="${oy + markBox / 2 - 6}" text-anchor="middle" fill="${colorVar("primary")}" font-family="var(--font-body)" font-size="10" font-weight="600">0.5w clear</text>
      <text x="${ox + markBox / 2}" y="${oy - clearSpace / 2 + 4}" text-anchor="middle" fill="${colorVar("primary")}" font-family="var(--font-body)" font-size="10" font-weight="600">Minimum clear space: half the mark width on all four sides</text>

      <ellipse cx="${ox + f.light.cx}" cy="${oy + f.light.cy}" rx="${f.light.rx}" ry="${f.light.ry}" fill="${colorVar("logo.shadow")}" fill-opacity="0.22" stroke="${colorVar("border.strong")}" stroke-width="1" stroke-dasharray="2 2"/>
      <text x="${ox + f.light.cx}" y="${oy + f.light.cy + 18}" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-mono)" font-size="10" style="font-variant-numeric:tabular-nums">Floor shadow: cx ${floor.cx}, cy ${floor.cy}, rx ${floor.rx}</text>

      ${circlesAndGuides}
    </svg>
    <figcaption class="diagram-caption">
      Geometry read directly from <code>FlumpLogo.art.ts</code>: three circles climbing from back (violet) through sky to front (teal), sharing one floor shadow inside a 200 by 200 view box with half-width clear space.
    </figcaption>
  </figure>`;
}
