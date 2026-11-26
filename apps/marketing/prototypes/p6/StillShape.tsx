import type { FC } from "react";
import { BOX, SHAPES, type ShapeKey } from "./shapes";

/**
 * The still version of one shape: the same beads as the 3D scene, drawn flat in SVG with the
 * logo's own gradient. It is what the server sends, what reduced motion keeps, and what shows
 * whenever the scene is not live. Decorative: the section's copy carries the meaning.
 */
export const StillShape: FC<{ shape: ShapeKey }> = ({ shape }) => {
  const { beads, shadow, solid } = SHAPES[shape];
  const lead = beads[0];
  const view = `${-BOX.width / 2} ${-BOX.height / 2} ${BOX.width} ${BOX.height}`;
  const fillId = `p6-still-${shape}`;
  return (
    <svg
      aria-hidden="true"
      className="p6-still"
      data-solid={solid > 0.5}
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      viewBox={view}
    >
      <defs>
        <radialGradient cx="38%" cy="30%" id={fillId} r="75%">
          <stop className="p6-still__lit" offset="0" />
          <stop className="p6-still__body" offset="1" />
        </radialGradient>
      </defs>
      {shadow > 0 && lead && (
        <ellipse
          className="p6-still__shadow"
          cx={lead.x}
          cy={-(lead.y - lead.r * lead.sy - 0.1)}
          rx={lead.r * lead.sx * 0.95}
          ry={0.1}
        />
      )}
      {beads
        .filter((b) => b.r > 0.001)
        .map((b) => (
          <g key={`${b.x.toFixed(3)}:${b.y.toFixed(3)}`}>
            <ellipse cx={b.x} cy={-b.y} fill={`url(#${fillId})`} rx={b.r * b.sx} ry={b.r * b.sy} />
            <ellipse
              className="p6-still__glint"
              cx={b.x - b.r * 0.32}
              cy={-b.y - b.r * 0.42}
              rx={b.r * 0.34}
              ry={b.r * 0.16}
              transform={`rotate(-24 ${b.x - b.r * 0.32} ${-b.y - b.r * 0.42})`}
            />
          </g>
        ))}
    </svg>
  );
};
