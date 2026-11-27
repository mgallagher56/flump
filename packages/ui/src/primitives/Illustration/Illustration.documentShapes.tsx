import type { FC, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import {
  type DocumentPalette,
  type DocumentPiece,
  type DocumentShape,
  documentEffects,
  EXAMPLE_TAG,
  tornEdgePath,
} from "./Illustration.documents";
import { documentClasses as c, documentOrbClasses as orb } from "./Illustration.styles";

const dash = (dashed?: boolean) => (dashed ? c.dashed : undefined);

/** The orb accent a shape takes, only under the opt-in orb palette. */
const accentOf = (shape: { orb?: DocumentPiece["orb"] }, palette: DocumentPalette) =>
  palette === "orb" ? shape.orb : undefined;

function renderText(shape: Extract<DocumentShape, { kind: "text" }>, key: string): ReactNode {
  const lineHeight = shape.lineHeight ?? Math.round(shape.size * 1.25);
  return (
    <text
      key={key}
      className={cx(
        c.ink[shape.ink],
        shape.font === "display" ? c.display : c.body,
        shape.numeric ? c.numeric : undefined,
      )}
      fontSize={shape.size}
      fontWeight={shape.weight ?? 400}
      textAnchor={shape.anchor ?? "start"}
      x={shape.x}
      y={shape.y}
    >
      {shape.lines.length === 1
        ? shape.lines[0]
        : shape.lines.map((line, i) => (
            // Lines are fixed sample text, so their index is a stable key.
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed sample lines never reorder
            <tspan key={i} dy={i === 0 ? 0 : lineHeight} x={shape.x}>
              {line}
            </tspan>
          ))}
    </text>
  );
}

function renderTag(shape: Extract<DocumentShape, { kind: "tag" }>, key: string): ReactNode {
  const { width, height, size, text } = EXAMPLE_TAG;
  const x = shape.anchor === "end" ? shape.x - width : shape.x;
  const onCharcoal = shape.tone === "onCharcoal";
  return (
    <g key={key} data-doc-tag="">
      <rect
        className={onCharcoal ? c.tagOnCharcoal : c.tagPaper}
        height={height}
        rx={height / 2}
        width={width}
        x={x}
        y={shape.y}
      />
      <text
        className={cx(onCharcoal ? c.ink.onCharcoal : c.ink.inkSecondary, c.body)}
        fontSize={size}
        fontWeight={600}
        textAnchor="middle"
        x={x + width / 2}
        y={shape.y + height / 2 + size * 0.35}
      >
        {text}
      </text>
    </g>
  );
}

function renderPiece(piece: DocumentPiece, key: string, palette: DocumentPalette): ReactNode {
  const { width, height, rx = 6 } = piece;
  const accent = accentOf(piece, palette);
  const body = accent ? orb.fill[accent] : c.surface[piece.surface];
  return (
    <g
      key={key}
      data-doc-orb={accent}
      data-doc-piece={piece.surface}
      transform={`translate(${piece.x} ${piece.y}) rotate(${piece.rotate} ${width / 2} ${height / 2})`}
    >
      {piece.shadow && !piece.bare ? (
        <rect
          className={c.shadow}
          data-doc-shadow=""
          height={height}
          rx={rx}
          width={width - documentEffects.shadow.inset * 2}
          x={documentEffects.shadow.inset}
          y={documentEffects.shadow.offsetY}
        />
      ) : null}
      {piece.bare ? null : (
        <>
          <rect
            className={cx(body, piece.edge ? c.edge : undefined)}
            data-doc-body=""
            height={height}
            rx={rx}
            width={width}
          />
          {piece.torn ? (
            <path
              className={cx(body, c.tornEdge)}
              data-doc-body=""
              d={tornEdgePath(width, height)}
            />
          ) : null}
        </>
      )}
      <DocumentShapeList palette={palette} shapes={piece.shapes} />
    </g>
  );
}

function renderShape(shape: DocumentShape, key: string, palette: DocumentPalette): ReactNode {
  switch (shape.kind) {
    case "piece":
      return renderPiece(shape, key, palette);
    case "text":
      return renderText(shape, key);
    case "tag":
      return renderTag(shape, key);
    case "rect": {
      const accent = accentOf(shape, palette);
      return (
        <rect
          key={key}
          className={cx(
            shape.fill ? (accent ? orb.fill[accent] : c.fill[shape.fill]) : c.noFill,
            shape.stroke ? (accent ? orb.stroke[accent] : c.stroke[shape.stroke]) : undefined,
            dash(shape.dashed),
          )}
          data-doc-orb={accent}
          height={shape.height}
          opacity={shape.opacity}
          rx={shape.rx}
          width={shape.width}
          x={shape.x}
          y={shape.y}
        />
      );
    }
    case "circle": {
      const accent = accentOf(shape, palette);
      return (
        <circle
          key={key}
          className={accent ? orb.fill[accent] : c.fill[shape.fill]}
          cx={shape.cx}
          cy={shape.cy}
          data-doc-orb={accent}
          opacity={shape.opacity}
          r={shape.r}
        />
      );
    }
    case "path": {
      const accent = accentOf(shape, palette);
      return (
        <path
          key={key}
          className={cx(
            shape.fill ? (accent ? orb.fill[accent] : c.fill[shape.fill]) : c.noFill,
            shape.stroke ? (accent ? orb.stroke[accent] : c.stroke[shape.stroke]) : undefined,
            dash(shape.dashed),
          )}
          d={shape.d}
          data-doc-orb={accent}
          opacity={shape.opacity}
          strokeWidth={shape.strokeWidth}
        />
      );
    }
  }
}

/**
 * Draws a document picture's shape list as SVG, in order: later shapes sit on top. `palette="orb"`
 * is the marketing home page's opt-in look (STYLE-GUIDE 8.3); the default draws the apps' look.
 */
export const DocumentShapeList: FC<{
  shapes: readonly DocumentShape[];
  palette?: DocumentPalette;
}> = ({ shapes, palette = "app" }) => (
  <>{shapes.map((shape, i) => renderShape(shape, String(i), palette))}</>
);
