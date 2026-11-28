import type { ColorKey, ShadowKey } from "../../packages/tokens/src/native.generated";
import type {
  DocumentFill,
  DocumentInk,
  DocumentOrbAccent,
  DocumentPalette,
  DocumentPicture,
  DocumentShape,
  DocumentStroke,
  DocumentSurface,
} from "../../packages/ui/src/primitives/Illustration/Illustration.documents";
import type {
  SceneColorRole,
  SceneShape,
} from "../../packages/ui/src/primitives/Illustration/Illustration.scenes";
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

export function renderProvenanceComment(sources: string): string {
  const safe = sources.replace(/—/g, "-").replace(/--+/g, "-");
  return `<!-- Provenance: ${safe} -->`;
}

export function renderExampleTag(): string {
  return `<span class="example-tag">Example</span>`;
}

export interface ThemedImageOptions {
  lightFile: string;
  darkFile: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
}

export function renderThemedImage(options: ThemedImageOptions): string {
  const { lightFile, darkFile, alt, width, height, caption } = options;
  const safeAlt = escapeHtml(alt);
  const cap = caption ? `<figcaption class="swatch-note">${escapeHtml(caption)}</figcaption>` : "";
  return `<figure class="history-figure">
    <img class="history-img themed-img-light" src="assets/history/${escapeHtml(lightFile)}" alt="${safeAlt} (light theme)" width="${width}" height="${height}" loading="lazy"/>
    <img class="history-img themed-img-dark" src="assets/history/${escapeHtml(darkFile)}" alt="${safeAlt} (dark theme)" width="${width}" height="${height}" loading="lazy"/>
    ${cap}
  </figure>`;
}

const ORB_ACCENT_COLOR: Record<DocumentOrbAccent, ColorKey> = {
  violet: "orb.violetRose.core",
  rose: "orb.violetRose.shade",
  teal: "orb.skyTeal.shade",
  violetTint: "orb.violetRose.bubble",
  tealTint: "orb.skyTeal.bubbleShade",
};

function resolveOrbAccent(
  accent: DocumentOrbAccent | undefined,
  palette: DocumentPalette,
): string | undefined {
  if (palette !== "orb" || !accent) return undefined;
  return colorVar(ORB_ACCENT_COLOR[accent]);
}

function resolveDocSurfaceColor(tokens: BrandTokens, surface: DocumentSurface): string {
  return colorVar(tokens.illustration.roleTokens.surface[surface] as ColorKey);
}

function resolveDocFillColor(tokens: BrandTokens, fill: DocumentFill): string {
  return colorVar(tokens.illustration.roleTokens.fill[fill] as ColorKey);
}

function resolveDocInkColor(tokens: BrandTokens, ink: DocumentInk): string {
  return colorVar(tokens.illustration.roleTokens.ink[ink] as ColorKey);
}

function resolveDocStrokeColor(tokens: BrandTokens, stroke: DocumentStroke): string {
  return colorVar(tokens.illustration.roleTokens.stroke[stroke] as ColorKey);
}

function renderDocumentShape(
  tokens: BrandTokens,
  shape: DocumentShape,
  pieceSurface: DocumentSurface,
  palette: DocumentPalette,
): string {
  switch (shape.kind) {
    case "rect": {
      const orbFill = resolveOrbAccent(shape.orb, palette);
      const fill = shape.fill ? (orbFill ?? resolveDocFillColor(tokens, shape.fill)) : "none";
      const stroke = shape.stroke
        ? (orbFill ?? resolveDocStrokeColor(tokens, shape.stroke))
        : "none";
      const dash = shape.dashed
        ? ` stroke-dasharray="${tokens.illustration.effects.dash.join(" ")}"`
        : "";
      const op = shape.opacity !== undefined ? ` opacity="${shape.opacity}"` : "";
      const rx = shape.rx !== undefined ? ` rx="${shape.rx}"` : "";
      return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}"${rx} fill="${fill}" stroke="${stroke}"${dash}${op}/>`;
    }
    case "circle": {
      const orbFill = resolveOrbAccent(shape.orb, palette);
      const fill = orbFill ?? resolveDocFillColor(tokens, shape.fill);
      const op = shape.opacity !== undefined ? ` opacity="${shape.opacity}"` : "";
      return `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}" fill="${fill}"${op}/>`;
    }
    case "path": {
      const orbAccent = resolveOrbAccent(shape.orb, palette);
      const fill = shape.fill ? (orbAccent ?? resolveDocFillColor(tokens, shape.fill)) : "none";
      const stroke = shape.stroke
        ? (orbAccent ?? resolveDocStrokeColor(tokens, shape.stroke))
        : "none";
      const sw = shape.strokeWidth ?? 1;
      const dash = shape.dashed
        ? ` stroke-dasharray="${tokens.illustration.effects.dash.join(" ")}"`
        : "";
      const op =
        shape.opacity !== undefined
          ? shape.opacity
          : shape.stroke === "onCharcoal"
            ? tokens.illustration.effects.onCharcoalStrokeOpacity
            : undefined;
      const opAttr = op !== undefined ? ` opacity="${op}"` : "";
      return `<path d="${escapeHtml(shape.d)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${dash}${opAttr}/>`;
    }
    case "tag": {
      const tag = tokens.illustration.exampleTag;
      const x = shape.anchor === "end" ? shape.x - tag.width : shape.x;
      const y = shape.y;
      const isCharcoal = shape.tone === "onCharcoal" || pieceSurface === "charcoal";
      const fill = isCharcoal ? "none" : colorVar("surface.sunken");
      const stroke = isCharcoal ? colorVar("text.onContrast") : colorVar("border");
      const strokeOp = isCharcoal
        ? ` stroke-opacity="${tokens.illustration.effects.tag.onCharcoalEdgeOpacity}"`
        : "";
      const textCol = isCharcoal ? colorVar("text.onContrast") : colorVar("text.secondary");
      return `<g>
        <rect x="${x}" y="${y}" width="${tag.width}" height="${tag.height}" rx="${tag.height / 2}" fill="${fill}" stroke="${stroke}" stroke-width="1"${strokeOp}/>
        <text x="${x + tag.width / 2}" y="${y + tag.height / 2 + tag.size * 0.35}" text-anchor="middle" fill="${textCol}" font-family="var(--font-body)" font-size="${tag.size}" font-weight="600">${tag.text}</text>
      </g>`;
    }
    case "text": {
      const fill = resolveDocInkColor(tokens, shape.ink);
      const font = shape.font === "display" ? "var(--font-heading)" : "var(--font-body)";
      const weight = shape.weight ?? 400;
      const anchor = shape.anchor ?? "start";
      const lh = shape.lineHeight ?? Math.round(shape.size * 1.25);
      const fvn = shape.numeric ? ' style="font-variant-numeric:tabular-nums"' : "";
      return shape.lines
        .map(
          (line, idx) =>
            `<text x="${shape.x}" y="${shape.y + idx * lh}" text-anchor="${anchor}" fill="${fill}" font-family="${font}" font-size="${shape.size}" font-weight="${weight}"${fvn}>${escapeHtml(line)}</text>`,
        )
        .join("");
    }
    case "piece":
      return renderDocumentPiece(tokens, shape, palette);
  }
}

function renderDocumentPiece(
  tokens: BrandTokens,
  piece: DocumentPicture["pieces"][number],
  palette: DocumentPalette,
): string {
  const transform =
    piece.rotate !== 0
      ? `translate(${piece.x} ${piece.y}) rotate(${piece.rotate} ${piece.width / 2} ${piece.height / 2})`
      : `translate(${piece.x} ${piece.y})`;
  const rx = piece.rx ?? 6;
  const fill =
    resolveOrbAccent(piece.orb, palette) ?? resolveDocSurfaceColor(tokens, piece.surface);

  const shadowEl =
    piece.shadow && !piece.bare
      ? `<rect class="doc-shadow" x="${tokens.illustration.effects.shadow.inset}" y="${tokens.illustration.effects.shadow.offsetY}" width="${piece.width - tokens.illustration.effects.shadow.inset * 2}" height="${piece.height}" rx="${rx}" fill="${colorVar("surface.contrast")}"/>`
      : "";

  const bodyEl = piece.bare
    ? ""
    : piece.torn
      ? `<path d="${tokens.illustration.tornEdgePath(piece.width, piece.height)}" fill="${fill}" stroke="${piece.edge ? colorVar("material.paper.edge") : "none"}"/><rect x="0" y="0" width="${piece.width}" height="${piece.height}" rx="${rx}" fill="${fill}"/>`
      : `<rect x="0" y="0" width="${piece.width}" height="${piece.height}" rx="${rx}" fill="${fill}"${piece.edge ? ` stroke="${colorVar("material.paper.edge")}" stroke-width="1"` : ""}/>`;

  const inner = piece.shapes
    .map((s) => renderDocumentShape(tokens, s, piece.surface, palette))
    .join("");
  return `<g transform="${transform}">${shadowEl}${bodyEl}${inner}</g>`;
}

export function renderDocumentPictureSvg(
  tokens: BrandTokens,
  picture: DocumentPicture,
  idSuffix: string,
  palette: DocumentPalette = "app",
): string {
  const w = tokens.illustration.gridWidth;
  const h = picture.height;
  const pieces = picture.pieces.map((p) => renderDocumentPiece(tokens, p, palette)).join("");
  return `<div class="doc-svg-wrap">
    <svg viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="doc-pic-${escapeHtml(idSuffix)}">
      <title id="doc-pic-${escapeHtml(idSuffix)}">${escapeHtml(picture.subject)}</title>
      ${pieces}
    </svg>
  </div>`;
}

const SCENE_CLASS_BY_ROLE: Record<SceneColorRole, string> = {
  ground: "scene-ground",
  apricot: "scene-apricot",
  sage: "scene-sage",
  tealSoft: "scene-teal-soft",
  teal: "scene-teal",
  leaf: "scene-leaf",
  paper: "scene-paper",
  accent: "scene-accent",
  dots: "scene-dots",
  stem: "scene-stem",
  pole: "scene-pole",
  tick: "scene-tick",
};

function renderFlatSceneShape(shape: SceneShape): string {
  const cls = SCENE_CLASS_BY_ROLE[shape.role];
  const op = shape.opacity !== undefined ? ` opacity="${shape.opacity}"` : "";
  switch (shape.kind) {
    case "ellipse":
      return `<ellipse class="${cls}" cx="${shape.cx}" cy="${shape.cy}" rx="${shape.rx}" ry="${shape.ry}"${op}/>`;
    case "circle":
      return `<circle class="${cls}" cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}"${op}/>`;
    case "rect": {
      const rx = shape.rx !== undefined ? ` rx="${shape.rx}"` : "";
      const tr = shape.transform ? ` transform="${escapeHtml(shape.transform)}"` : "";
      return `<rect class="${cls}" x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}"${rx}${tr}${op}/>`;
    }
    case "path":
      return `<path class="${cls}" d="${escapeHtml(shape.d)}"${op}/>`;
  }
}

export function renderFlatSceneSvg(
  shapes: readonly SceneShape[],
  title: string,
  idSuffix: string,
): string {
  const body = shapes.map(renderFlatSceneShape).join("");
  return `<div class="doc-svg-wrap flat-scene-wrap">
    <svg viewBox="0 0 240 180" role="img" aria-labelledby="flat-pic-${escapeHtml(idSuffix)}">
      <title id="flat-pic-${escapeHtml(idSuffix)}">${escapeHtml(title)}</title>
      ${body}
    </svg>
  </div>`;
}
