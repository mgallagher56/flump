import type { ColorKey } from "../../../packages/tokens/src/native.generated";
import type {
  DocumentFill,
  DocumentInk,
  DocumentPicture,
  DocumentShape,
  DocumentStroke,
  DocumentSurface,
} from "../../../packages/ui/src/primitives/Illustration/Illustration.documents";
import { renderSourceCite } from "../renderHelpers";
import { type BrandTokens, colorVar, escapeHtml } from "../tokens";

function resolveSurfaceColor(tokens: BrandTokens, surface: DocumentSurface): string {
  const key = tokens.illustration.roleTokens.surface[surface] as ColorKey;
  return colorVar(key);
}

function resolveFillColor(tokens: BrandTokens, fill: DocumentFill): string {
  const key = tokens.illustration.roleTokens.fill[fill] as ColorKey;
  return colorVar(key);
}

function resolveInkColor(tokens: BrandTokens, ink: DocumentInk): string {
  const key = tokens.illustration.roleTokens.ink[ink] as ColorKey;
  return colorVar(key);
}

function resolveStrokeColor(tokens: BrandTokens, stroke: DocumentStroke): string {
  const key = tokens.illustration.roleTokens.stroke[stroke] as ColorKey;
  return colorVar(key);
}

function renderShape(
  tokens: BrandTokens,
  shape: DocumentShape,
  pieceSurface: DocumentSurface,
): string {
  switch (shape.kind) {
    case "rect": {
      const fill = shape.fill ? resolveFillColor(tokens, shape.fill) : "none";
      const stroke = shape.stroke ? resolveStrokeColor(tokens, shape.stroke) : "none";
      const dash = shape.dashed
        ? ` stroke-dasharray="${tokens.illustration.effects.dash.join(" ")}"`
        : "";
      const op = shape.opacity !== undefined ? ` opacity="${shape.opacity}"` : "";
      const rx = shape.rx !== undefined ? ` rx="${shape.rx}"` : "";
      return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}"${rx} fill="${fill}" stroke="${stroke}"${dash}${op}/>`;
    }
    case "circle": {
      const fill = resolveFillColor(tokens, shape.fill);
      const op = shape.opacity !== undefined ? ` opacity="${shape.opacity}"` : "";
      return `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}" fill="${fill}"${op}/>`;
    }
    case "path": {
      const fill = shape.fill ? resolveFillColor(tokens, shape.fill) : "none";
      const stroke = shape.stroke ? resolveStrokeColor(tokens, shape.stroke) : "none";
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
        <text x="${x + tag.width / 2}" y="${y + 15}" text-anchor="middle" fill="${textCol}" font-family="var(--font-body)" font-size="${tag.size}" font-weight="500">${tag.text}</text>
      </g>`;
    }
    case "text": {
      const fill = resolveInkColor(tokens, shape.ink);
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
      return renderPiece(tokens, shape);
  }
}

function renderPiece(tokens: BrandTokens, piece: DocumentPicture["pieces"][number]): string {
  const cx = piece.x + piece.width / 2;
  const cy = piece.y + piece.height / 2;
  const transform =
    piece.rotate !== 0
      ? `translate(${piece.x} ${piece.y}) rotate(${piece.rotate} ${piece.width / 2} ${piece.height / 2})`
      : `translate(${piece.x} ${piece.y})`;
  const rx = piece.rx ?? 6;
  const fill = resolveSurfaceColor(tokens, piece.surface);

  const shadowEl =
    piece.shadow && !piece.bare
      ? `<rect x="${tokens.illustration.effects.shadow.inset}" y="${tokens.illustration.effects.shadow.offsetY}" width="${piece.width - tokens.illustration.effects.shadow.inset * 2}" height="${piece.height}" rx="${rx}" fill="${colorVar("surface.contrast")}" opacity="0.14"/>`
      : "";

  const bodyEl = piece.bare
    ? ""
    : piece.torn
      ? `<path d="${tokens.illustration.tornEdgePath(piece.width, piece.height)}" fill="${fill}" stroke="${piece.edge ? colorVar("material.paper.edge") : "none"}"/><rect x="0" y="0" width="${piece.width}" height="${piece.height}" rx="${rx}" fill="${fill}"/>`
      : `<rect x="0" y="0" width="${piece.width}" height="${piece.height}" rx="${rx}" fill="${fill}"${piece.edge ? ` stroke="${colorVar("material.paper.edge")}" stroke-width="1"` : ""}/>`;

  const inner = piece.shapes.map((s) => renderShape(tokens, s, piece.surface)).join("");
  void cx;
  void cy;
  return `<g transform="${transform}">${shadowEl}${bodyEl}${inner}</g>`;
}

function renderDocumentPictureSvg(
  tokens: BrandTokens,
  picture: DocumentPicture,
  idSuffix: string,
): string {
  const w = tokens.illustration.gridWidth;
  const h = picture.height;
  const pieces = picture.pieces.map((p) => renderPiece(tokens, p)).join("");
  return `<div class="doc-svg-wrap">
    <svg viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="doc-pic-${idSuffix}">
      <title id="doc-pic-${idSuffix}">${escapeHtml(picture.subject)}</title>
      ${pieces}
    </svg>
  </div>`;
}

export function renderIllustrationChapter(tokens: BrandTokens): string {
  const defs = tokens.illustration.definitions;
  const accountsPic = defs["empty-accounts"];
  const debtPic = defs["feature-debt"];

  return `<section class="chapter" id="illustration">
    <div class="chapter-head">
      <span class="chapter-kicker">Chapter 07</span>
      <h2 class="chapter-title">Illustration</h2>
    </div>

    <p class="prose">
      Flump draws every picture from shared shape lists through the single <code>Illustration</code> primitive (Rule IL4). No external image files are used for illustrations: the web renders SVG from the shape list, and mobile draws the exact same list with <code>react-native-svg</code> via <code>@repo/ui/illustration-data</code>.
    </p>

    <div class="grid-2">
      <article class="card">
        <h3 class="card-title">Document cards (27 November 2026)</h3>
        <p class="prose">
          Tilted bank cards, payslips, budget slips, statements, calendar pages and tickets (at most 6 degrees of tilt) drawn in a ${tokens.illustration.gridWidth}-unit grid and never narrower than ${tokens.illustration.minWidth}px so the smallest text (${tokens.illustration.minText} grid units) stays at 12px or above. Cards with sample figures carry a real-text "${tokens.illustration.exampleTag.text}" tag.
        </p>
        ${renderDocumentPictureSvg(tokens, accountsPic, "empty-accounts")}
        <p class="swatch-note">Rendered directly from <code>documentDefinitions["empty-accounts"]</code> in <code>Illustration.documents.ts</code>.</p>
      </article>

      <article class="card">
        <h3 class="card-title">App palette and opt-in orb look</h3>
        <p class="prose">
          By default (<code>palette="app"</code>), credit cards stay mint (<code>primary.subtle</code>) and never rose or red. The marketing home page may opt into <code>palette="orb"</code> for its allow-listed marks under rule MC1.
        </p>
        ${renderDocumentPictureSvg(tokens, debtPic, "feature-debt")}
        <p class="swatch-note">Rendered directly from <code>documentDefinitions["feature-debt"]</code> in <code>Illustration.documents.ts</code>.</p>
      </article>
    </div>

    <div class="grid-2">
      <article class="card-subtle">
        <h3 class="card-title">Flat scenes (E17)</h3>
        <p class="prose">
          Apps keep flat scenes on a 240 by 170 grid (ground line at 152, 20 clear at the sides, 10 at the top) until the switch to document cards (decision D4). Each scene uses one sun, one dotted arc, at most one leaf or sprout and three to five rounded solid forms (14px corners, no outlines).
        </p>
      </article>

      <article class="card-subtle">
        <h3 class="card-title">Placement and exclusions</h3>
        <ul class="plain-list">
          <li>Pictures are decorative (<code>aria-hidden</code>); text beside them carries the meaning.</li>
          <li>Never show beside a price on marketing pricing, beside a real figure on a compact viewport, inside a notice, or in an error about money. Error pages keep their picture still.</li>
          <li>Never draw people, faces, piles of coins, upward-arrow growth clichés, red fills, chequered finish flags or glass objects inside pictures.</li>
        </ul>
      </article>
    </div>

    ${renderSourceCite("STYLE-GUIDE 8, 8.1 to 8.3; UX-GUIDELINES 12.1, 12.2 (MK7), 14 (B10); Illustration.documents.ts")}
  </section>`;
}
