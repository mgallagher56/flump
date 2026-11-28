import type { ColorKey, ShadowKey } from "../../packages/tokens/src/native.generated";
import { type BrandTokens, colorVar, escapeHtml, shadowVar } from "./tokens";

export interface LogoRenderOptions {
  idPrefix: string;
  sizePx: number;
  title?: string;
}

export function renderK2LogoSvg(tokens: BrandTokens, options: LogoRenderOptions): string {
  const { idPrefix, sizePx, title } = options;
  const { viewBox, orbs, floor, orbLayout, floorLayout } = tokens.logo;
  const f = floorLayout(floor);

  const toneVar = (tone: "teal" | "sky" | "violet" | "rose") => colorVar(`logo.${tone}`);

  const orbDefs = orbs
    .map((orb, i) => {
      const { body, rim, sheen } = orbLayout(orb);
      const t = toneVar(orb.tone);
      const l = toneVar(orb.light);
      const glintCol = colorVar("logo.glint");
      return `
      <radialGradient id="${idPrefix}-${i}-body" gradientUnits="userSpaceOnUse" cx="${body.cx}" cy="${body.cy}" r="${body.r}">
        <stop offset="0" stop-color="${t}" style="stop-opacity:var(--logo-op-core)"/>
        <stop offset="0.62" stop-color="${t}" style="stop-opacity:var(--logo-op-mid)"/>
        <stop offset="1" stop-color="${t}" stop-opacity="1"/>
      </radialGradient>
      <radialGradient id="${idPrefix}-${i}-rim" gradientUnits="userSpaceOnUse" cx="${rim.cx}" cy="${rim.cy}" r="${rim.r}">
        <stop offset="0" stop-color="${l}" stop-opacity="0.95"/>
        <stop offset="0.55" stop-color="${l}" stop-opacity="0.35"/>
        <stop offset="1" stop-color="${l}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${idPrefix}-${i}-sheen" gradientUnits="userSpaceOnUse" cx="${sheen.cx}" cy="${sheen.cy}" r="${sheen.r}">
        <stop offset="0" stop-color="${glintCol}" style="stop-opacity:var(--logo-op-sheen)"/>
        <stop offset="1" stop-color="${glintCol}" stop-opacity="0"/>
      </radialGradient>`;
    })
    .join("");

  const orbShapes = orbs
    .map((orb, i) => {
      const { glint } = orbLayout(orb);
      const glintShape = orb.glint
        ? `<ellipse cx="${glint.cx}" cy="${glint.cy}" rx="${glint.rx}" ry="${glint.ry}" transform="${glint.transform}" fill="${colorVar("logo.glint")}" style="opacity:var(--logo-op-glint)"/>`
        : "";
      return `
      <g data-tone="${orb.tone}">
        <circle cx="${orb.cx}" cy="${orb.cy}" r="${orb.r}" fill="${colorVar("logo.backing")}" style="opacity:var(--logo-op-backing)"/>
        <circle cx="${orb.cx}" cy="${orb.cy}" r="${orb.r}" fill="url(#${idPrefix}-${i}-body)"/>
        <circle cx="${orb.cx}" cy="${orb.cy}" r="${orb.r}" fill="url(#${idPrefix}-${i}-rim)"/>
        <circle cx="${orb.cx}" cy="${orb.cy}" r="${orb.r}" fill="url(#${idPrefix}-${i}-sheen)"/>
        ${glintShape}
      </g>`;
    })
    .join("");

  const ariaAttrs = title
    ? `role="img" aria-label="${escapeHtml(title)}"`
    : `aria-hidden="true" role="presentation"`;

  const titleEl = title ? `<title>${escapeHtml(title)}</title>` : "";

  return `<svg width="${sizePx}" height="${sizePx}" viewBox="${viewBox}" ${ariaAttrs} focusable="false">
    ${titleEl}
    <defs>
      <radialGradient id="${idPrefix}-contact">
        <stop offset="0" stop-color="${colorVar("logo.shadow")}" stop-opacity="0.75"/>
        <stop offset="0.6" stop-color="${colorVar("logo.shadow")}" stop-opacity="0.4"/>
        <stop offset="1" stop-color="${colorVar("logo.shadow")}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${idPrefix}-pool">
        <stop offset="0" stop-color="${colorVar("logo.teal")}" stop-opacity="0.5"/>
        <stop offset="0.45" stop-color="${colorVar("logo.teal")}" stop-opacity="0.2"/>
        <stop offset="1" stop-color="${colorVar("logo.teal")}" stop-opacity="0"/>
      </radialGradient>
      ${orbDefs}
    </defs>
    <ellipse class="logo-floor-light" cx="${f.light.cx}" cy="${f.light.cy}" rx="${f.light.rx}" ry="${f.light.ry}" fill="${colorVar("logo.shadow")}" opacity="${f.light.opacity}"/>
    <g class="logo-floor-dark">
      <ellipse cx="${f.contact.cx}" cy="${f.contact.cy}" rx="${f.contact.rx}" ry="${f.contact.ry}" fill="url(#${idPrefix}-contact)"/>
      <ellipse cx="${f.pool.cx}" cy="${f.pool.cy}" rx="${f.pool.rx}" ry="${f.pool.ry}" fill="url(#${idPrefix}-pool)"/>
    </g>
    ${orbShapes}
  </svg>`;
}

export function renderColorSwatch(tokens: BrandTokens, key: ColorKey, note: string): string {
  const lightVal = tokens.native.light.colors[key];
  const darkVal = tokens.native.dark.colors[key];
  return `<div class="swatch-card" data-path="${escapeHtml(key)}" data-light="${escapeHtml(lightVal)}" data-dark="${escapeHtml(darkVal)}">
    <div class="swatch-chip" style="background:${colorVar(key)}" aria-hidden="true"></div>
    <div class="swatch-meta">
      <div><code>${escapeHtml(key)}</code></div>
      <div class="swatch-values">
        <span class="swatch-val">Light: <strong>${escapeHtml(lightVal)}</strong></span>
        <span class="swatch-val">Dark: <strong>${escapeHtml(darkVal)}</strong></span>
      </div>
      <p class="swatch-note">${escapeHtml(note)}</p>
    </div>
  </div>`;
}

export function renderShadowSpecimen(tokens: BrandTokens, key: ShadowKey, note: string): string {
  const lightVal = tokens.native.light.shadows[key];
  const darkVal = tokens.native.dark.shadows[key];
  return `<div class="shadow-demo" style="box-shadow:${shadowVar(key)}" data-path="shadows.${escapeHtml(key)}" data-light="${escapeHtml(lightVal)}" data-dark="${escapeHtml(darkVal)}">
    <div><code>shadows.${escapeHtml(key)}</code></div>
    <p class="swatch-note">${escapeHtml(note)}</p>
    <div class="swatch-values">
      <span class="swatch-val">Light: <code>${escapeHtml(lightVal)}</code></span>
    </div>
    <div class="swatch-values">
      <span class="swatch-val">Dark: <code>${escapeHtml(darkVal)}</code></span>
    </div>
  </div>`;
}

export function renderTokenRow(path: string, value: string, note: string): string {
  return `<tr>
    <td><code>${escapeHtml(path)}</code></td>
    <td class="num" data-path="${escapeHtml(path)}" data-value="${escapeHtml(value)}"><strong>${escapeHtml(value)}</strong></td>
    <td>${escapeHtml(note)}</td>
  </tr>`;
}

export function renderSourceCite(sources: string): string {
  return `<p class="source-cite">Sources: ${escapeHtml(sources)}</p>`;
}

export function renderExampleTag(): string {
  return `<span class="example-tag">Example</span>`;
}
