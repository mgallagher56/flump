import type { FC, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import {
  type DocumentPiece,
  type DocumentShape,
  EXAMPLE_TAG,
  tornEdgePath,
} from "./Illustration.documents";
import { documentClasses as c } from "./Illustration.styles";

const dash = (dashed?: boolean) => (dashed ? c.dashed : undefined);

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

function renderPiece(piece: DocumentPiece, key: string): ReactNode {
  const { width, height, rx = 6 } = piece;
  return (
    <g
      key={key}
      data-doc-piece={piece.surface}
      transform={`translate(${piece.x} ${piece.y}) rotate(${piece.rotate} ${width / 2} ${height / 2})`}
    >
      {piece.shadow && !piece.bare ? (
        <rect
          className={c.shadow}
          data-doc-shadow=""
          height={height}
          rx={rx}
          width={width - 12}
          x={6}
          y={10}
        />
      ) : null}
      {piece.bare ? null : (
        <>
          <rect
            className={cx(c.surface[piece.surface], piece.edge ? c.edge : undefined)}
            data-doc-body=""
            height={height}
            rx={rx}
            width={width}
          />
          {piece.torn ? (
            <path
              className={cx(c.surface[piece.surface], c.tornEdge)}
              data-doc-body=""
              d={tornEdgePath(width, height)}
            />
          ) : null}
        </>
      )}
      <DocumentShapeList shapes={piece.shapes} />
    </g>
  );
}

function renderShape(shape: DocumentShape, key: string): ReactNode {
  switch (shape.kind) {
    case "piece":
      return renderPiece(shape, key);
    case "text":
      return renderText(shape, key);
    case "tag":
      return renderTag(shape, key);
    case "rect":
      return (
        <rect
          key={key}
          className={cx(
            shape.fill ? c.fill[shape.fill] : c.noFill,
            shape.stroke ? c.stroke[shape.stroke] : undefined,
            dash(shape.dashed),
          )}
          height={shape.height}
          opacity={shape.opacity}
          rx={shape.rx}
          width={shape.width}
          x={shape.x}
          y={shape.y}
        />
      );
    case "circle":
      return (
        <circle
          key={key}
          className={c.fill[shape.fill]}
          cx={shape.cx}
          cy={shape.cy}
          opacity={shape.opacity}
          r={shape.r}
        />
      );
    case "path":
      return (
        <path
          key={key}
          className={cx(
            shape.fill ? c.fill[shape.fill] : c.noFill,
            shape.stroke ? c.stroke[shape.stroke] : undefined,
            dash(shape.dashed),
          )}
          d={shape.d}
          opacity={shape.opacity}
          strokeWidth={shape.strokeWidth}
        />
      );
  }
}

/** Draws a document picture's shape list as SVG, in order: later shapes sit on top. */
export const DocumentShapeList: FC<{ shapes: readonly DocumentShape[] }> = ({ shapes }) => (
  <>{shapes.map((shape, i) => renderShape(shape, String(i)))}</>
);
