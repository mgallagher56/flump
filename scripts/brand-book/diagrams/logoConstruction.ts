import { type BrandTokens, colorVar } from "../tokens";

export function renderLogoConstructionDiagram(tokens: BrandTokens): string {
  const { orbs, floor, floorLayout } = tokens.logo;
  const f = floorLayout(floor);

  const totalW = 760;
  const totalH = 400;
  const markBox = 160;
  const scale = markBox / 200;
  const clearSpace = markBox * 0.5;
  const ox = 300;
  const oy = 124;

  const toneColor = (tone: "teal" | "sky" | "violet" | "rose") => colorVar(`logo.${tone}`);

  const orbCircles = orbs
    .map((orb) => {
      const cx = ox + orb.cx * scale;
      const cy = oy + orb.cy * scale;
      const r = orb.r * scale;
      const col = toneColor(orb.tone);
      return `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}" fill-opacity="0.16" stroke="${col}" stroke-width="2"/>
      <line x1="${cx - 4}" y1="${cy}" x2="${cx + 4}" y2="${cy}" stroke="${colorVar("text.primary")}" stroke-width="1.25"/>
      <line x1="${cx}" y1="${cy - 4}" x2="${cx}" y2="${cy + 4}" stroke="${colorVar("text.primary")}" stroke-width="1.25"/>`;
    })
    .join("");

  const smallOrb = orbs[0];
  const midOrb = orbs[1];
  const largeOrb = orbs[2];

  const smallCx = ox + (smallOrb?.cx ?? 108) * scale;
  const smallCy = oy + (smallOrb?.cy ?? 54) * scale;
  const smallR = (smallOrb?.r ?? 20) * scale;
  const smallStartX = (smallCx - smallR * Math.SQRT1_2).toFixed(1);
  const smallStartY = (smallCy - smallR * Math.SQRT1_2).toFixed(1);

  const midCx = ox + (midOrb?.cx ?? 140) * scale;
  const midCy = oy + (midOrb?.cy ?? 92) * scale;
  const midR = (midOrb?.r ?? 28) * scale;
  const midStartX = (midCx + midR).toFixed(1);
  const midStartY = midCy.toFixed(1);

  const largeCx = ox + (largeOrb?.cx ?? 84) * scale;
  const largeCy = oy + (largeOrb?.cy ?? 122) * scale;
  const largeR = (largeOrb?.r ?? 48) * scale;
  const largeStartX = (largeCx - largeR).toFixed(1);
  const largeStartY = largeCy.toFixed(1);

  const shadowCx = ox + f.light.cx * scale;
  const shadowCy = oy + f.light.cy * scale;
  const shadowRx = f.light.rx * scale;
  const shadowRy = f.light.ry * scale;
  const shadowLeftX = (shadowCx - shadowRx).toFixed(1);
  const shadowLeftY = shadowCy.toFixed(1);

  const leaderStroke = colorVar("border.strong");
  const primaryCol = colorVar("primary");
  const inkPrimary = colorVar("text.primary");
  const inkMuted = colorVar("text.muted");

  return `<figure class="diagram-figure" data-diagram="logo-construction">
    <svg viewBox="0 0 ${totalW} ${totalH}" role="img" aria-labelledby="diag-logo-title diag-logo-desc">
      <title id="diag-logo-title">Logo construction and clear space</title>
      <desc id="diag-logo-desc">Three glass bubbles stacked above one floor shadow inside a square frame, surrounded by clear space equal to half the mark width on all sides.</desc>
      <rect x="1" y="1" width="${totalW - 2}" height="${totalH - 2}" rx="14" fill="${colorVar("surface.subtle")}" stroke="${colorVar("border")}" stroke-width="1"/>

      <text x="${totalW / 2}" y="26" text-anchor="middle" fill="${primaryCol}" font-family="var(--font-body)" font-size="12.5" font-weight="600">Clear space: half the mark's width on all sides</text>

      <rect x="${ox - clearSpace}" y="${oy - clearSpace}" width="${markBox + clearSpace * 2}" height="${markBox + clearSpace * 2}" rx="8" fill="none" stroke="${leaderStroke}" stroke-width="1.25" stroke-dasharray="6 4"/>
      <rect x="${ox}" y="${oy}" width="${markBox}" height="${markBox}" fill="${colorVar("surface.card")}" stroke="${primaryCol}" stroke-width="1.5"/>

      <line x1="${ox + markBox / 2}" y1="${oy - clearSpace}" x2="${ox + markBox / 2}" y2="${oy}" stroke="${primaryCol}" stroke-width="1.25"/>
      <line x1="${ox + markBox / 2 - 5}" y1="${oy - clearSpace}" x2="${ox + markBox / 2 + 5}" y2="${oy - clearSpace}" stroke="${primaryCol}" stroke-width="1.25"/>
      <line x1="${ox + markBox / 2 - 5}" y1="${oy}" x2="${ox + markBox / 2 + 5}" y2="${oy}" stroke="${primaryCol}" stroke-width="1.25"/>
      <text x="${ox + markBox / 2 + 10}" y="${oy - clearSpace / 2 + 4}" text-anchor="start" fill="${primaryCol}" font-family="var(--font-body)" font-size="12" font-weight="600">Half width</text>

      <ellipse cx="${shadowCx}" cy="${shadowCy}" rx="${shadowRx}" ry="${shadowRy}" fill="${colorVar("logo.shadow")}" fill-opacity="0.22" stroke="${leaderStroke}" stroke-width="1" stroke-dasharray="2 2"/>
      ${orbCircles}

      <polyline points="${smallStartX},${smallStartY} 288,130 212,130" fill="none" stroke="${leaderStroke}" stroke-width="1.15"/>
      <text x="202" y="126" text-anchor="end" fill="${inkPrimary}" font-family="var(--font-body)" font-size="13" font-weight="600">Smallest bubble, violet</text>
      <text x="202" y="143" text-anchor="end" fill="${inkMuted}" font-family="var(--font-body)" font-size="11.5">Back layer, rose edge light</text>

      <line x1="${largeStartX}" y1="${largeStartY}" x2="212" y2="${largeStartY}" stroke="${leaderStroke}" stroke-width="1.15"/>
      <text x="202" y="${Number(largeStartY) - 4}" text-anchor="end" fill="${inkPrimary}" font-family="var(--font-body)" font-size="13" font-weight="600">Largest bubble, teal</text>
      <text x="202" y="${Number(largeStartY) + 13}" text-anchor="end" fill="${inkMuted}" font-family="var(--font-body)" font-size="11.5">Front layer, violet edge light</text>

      <polyline points="${shadowLeftX},${shadowLeftY} 276,304 212,304" fill="none" stroke="${leaderStroke}" stroke-width="1.15"/>
      <text x="202" y="300" text-anchor="end" fill="${inkPrimary}" font-family="var(--font-body)" font-size="13" font-weight="600">Shared floor shadow</text>
      <text x="202" y="317" text-anchor="end" fill="${inkMuted}" font-family="var(--font-body)" font-size="11.5">Grounds all three bubbles</text>

      <line x1="${ox + markBox + clearSpace}" y1="124" x2="550" y2="124" stroke="${leaderStroke}" stroke-width="1.15"/>
      <text x="558" y="120" text-anchor="start" fill="${inkPrimary}" font-family="var(--font-body)" font-size="13" font-weight="600">Clear-space edge</text>
      <text x="558" y="137" text-anchor="start" fill="${inkMuted}" font-family="var(--font-body)" font-size="11.5">Keep free of text or marks</text>

      <line x1="${midStartX}" y1="${midStartY}" x2="550" y2="${midStartY}" stroke="${leaderStroke}" stroke-width="1.15"/>
      <text x="558" y="${Number(midStartY) - 4}" text-anchor="start" fill="${inkPrimary}" font-family="var(--font-body)" font-size="13" font-weight="600">Middle bubble, sky</text>
      <text x="558" y="${Number(midStartY) + 13}" text-anchor="start" fill="${inkMuted}" font-family="var(--font-body)" font-size="11.5">Middle layer, violet edge light</text>

      <line x1="${ox + markBox}" y1="284" x2="550" y2="284" stroke="${leaderStroke}" stroke-width="1.15"/>
      <text x="558" y="280" text-anchor="start" fill="${inkPrimary}" font-family="var(--font-body)" font-size="13" font-weight="600">Square mark frame</text>
      <text x="558" y="297" text-anchor="start" fill="${inkMuted}" font-family="var(--font-body)" font-size="11.5">Exact sizes in reference</text>
    </svg>
    <figcaption class="diagram-caption">
      Three circles climb from violet at the back through sky to teal at the front above one floor shadow, with clear space equal to half the mark's width on every side.
    </figcaption>
  </figure>`;
}
