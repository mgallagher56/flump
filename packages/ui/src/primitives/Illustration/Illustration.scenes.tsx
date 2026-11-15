import type { FC, ReactNode } from "react";
import { sceneClasses as c } from "./Illustration.styles";

export type IllustrationScene =
  | "empty-accounts"
  | "empty-goals"
  | "empty-savings"
  | "empty-debt"
  | "empty-pension"
  | "check-in"
  | "check-in-done"
  | "onboarding"
  | "not-found";

export type SceneColorRole = keyof typeof c;
export type ScenePart = "sun" | "sprout";

interface ShapeBase {
  role: SceneColorRole;
  opacity?: number;
  part?: ScenePart;
}

export type SceneShape =
  | (ShapeBase & {
      kind: "ellipse";
      cx: number;
      cy: number;
      rx: number;
      ry: number;
    })
  | (ShapeBase & {
      kind: "circle";
      cx: number;
      cy: number;
      r: number;
    })
  | (ShapeBase & {
      kind: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      rx?: number;
      transform?: string;
    })
  | (ShapeBase & {
      kind: "path";
      d: string;
    });

const groundShape: SceneShape = {
  kind: "ellipse",
  role: "sand",
  cx: 120,
  cy: 152,
  rx: 106,
  ry: 18,
};

/** Three-part sprout sitting on the tallest onboarding step and on the finished setup card. */
export const budgetSproutShapes: readonly SceneShape[] = [
  { kind: "path", role: "stem", d: "M168 58V38", part: "sprout" },
  {
    kind: "path",
    role: "sage",
    d: "M168 44c-13 0-19-6-19-17 12 0 19 6 19 17z",
    part: "sprout",
  },
  {
    kind: "path",
    role: "leaf",
    d: "M168 38c11 0 17-5 17-14-11 0-17 5-17 14z",
    part: "sprout",
  },
];

const checkInBaseShapes: readonly SceneShape[] = [
  groundShape,
  { kind: "circle", role: "apricot", cx: 44, cy: 46, r: 30, opacity: 0.4, part: "sun" },
  { kind: "circle", role: "apricot", cx: 44, cy: 46, r: 18, part: "sun" },
  { kind: "path", role: "dots", d: "M74 34C96 22 124 22 146 32" },
  { kind: "rect", role: "tealSoft", x: 64, y: 54, width: 112, height: 96, rx: 14 },
  { kind: "path", role: "teal", d: "M64 68a14 14 0 0 1 14-14h84a14 14 0 0 1 14 14v16H64z" },
  { kind: "rect", role: "paper", x: 88, y: 44, width: 9, height: 22, rx: 4.5 },
  { kind: "rect", role: "paper", x: 143, y: 44, width: 9, height: 22, rx: 4.5 },
  { kind: "rect", role: "paper", x: 78, y: 96, width: 24, height: 18, rx: 6, opacity: 0.85 },
  { kind: "rect", role: "paper", x: 108, y: 96, width: 24, height: 18, rx: 6, opacity: 0.85 },
  { kind: "rect", role: "paper", x: 138, y: 96, width: 24, height: 18, rx: 6, opacity: 0.85 },
  { kind: "rect", role: "paper", x: 78, y: 120, width: 24, height: 18, rx: 6, opacity: 0.85 },
  { kind: "rect", role: "accent", x: 108, y: 120, width: 24, height: 18, rx: 6 },
  { kind: "path", role: "leaf", d: "M50 150c-12 0-18-6-18-16 11 0 18 5 18 16z" },
];

export const sceneDefinitions: Record<IllustrationScene, readonly SceneShape[]> = {
  /** Stacked cards, nothing linked yet. */
  "empty-accounts": [
    groundShape,
    { kind: "circle", role: "apricot", cx: 196, cy: 38, r: 30, opacity: 0.4, part: "sun" },
    { kind: "circle", role: "apricot", cx: 196, cy: 38, r: 18, part: "sun" },
    {
      kind: "rect",
      role: "sage",
      height: 62,
      rx: 14,
      transform: "rotate(8 152 97)",
      width: 108,
      x: 98,
      y: 66,
    },
    {
      kind: "rect",
      role: "tealSoft",
      height: 62,
      rx: 14,
      transform: "rotate(-6 110 99)",
      width: 108,
      x: 56,
      y: 68,
    },
    { kind: "rect", role: "teal", height: 66, rx: 14, width: 112, x: 64, y: 76 },
    { kind: "rect", role: "paper", height: 10, opacity: 0.85, rx: 5, width: 40, x: 78, y: 92 },
    { kind: "circle", role: "apricot", cx: 160, cy: 118, r: 8 },
    { kind: "path", role: "dots", d: "M40 70C52 54 66 46 84 42" },
  ],
  /** A target with a flag on top, no goals set yet. */
  "empty-goals": [
    groundShape,
    { kind: "circle", role: "apricot", cx: 50, cy: 48, r: 26, opacity: 0.4, part: "sun" },
    { kind: "circle", role: "apricot", cx: 50, cy: 48, r: 15, part: "sun" },
    { kind: "circle", role: "tealSoft", cx: 120, cy: 108, r: 46 },
    { kind: "circle", role: "paper", cx: 120, cy: 108, r: 32 },
    { kind: "circle", role: "teal", cx: 120, cy: 108, r: 16 },
    { kind: "circle", role: "apricot", cx: 120, cy: 108, r: 6 },
    { kind: "path", role: "pole", d: "M120 108V40" },
    { kind: "path", role: "leaf", d: "M120 40h34l-8 11 8 11h-34z" },
    { kind: "path", role: "dots", d: "M174 118C190 108 200 96 204 80" },
  ],
  /** Savings jar with stacked coins waiting inside. */
  "empty-savings": [
    groundShape,
    { kind: "circle", role: "apricot", cx: 46, cy: 44, r: 30, opacity: 0.4, part: "sun" },
    { kind: "circle", role: "apricot", cx: 46, cy: 44, r: 18, part: "sun" },
    { kind: "path", role: "dots", d: "M76 32C92 20 106 18 116 22" },
    { kind: "circle", role: "accent", cx: 124, cy: 34, r: 10 },
    { kind: "rect", role: "tealSoft", x: 78, y: 62, width: 88, height: 90, rx: 22 },
    { kind: "rect", role: "teal", x: 72, y: 56, width: 100, height: 14, rx: 7 },
    { kind: "rect", role: "paper", x: 92, y: 98, width: 60, height: 13, rx: 6.5, opacity: 0.85 },
    { kind: "rect", role: "sage", x: 92, y: 114, width: 60, height: 13, rx: 6.5 },
    { kind: "rect", role: "teal", x: 92, y: 130, width: 60, height: 13, rx: 6.5 },
    { kind: "path", role: "leaf", d: "M198 150c12 0 18-6 18-16-11 0-18 5-18 16z" },
  ],
  /** Stepping stones lowering toward zero, no debts added yet. */
  "empty-debt": [
    groundShape,
    { kind: "circle", role: "apricot", cx: 196, cy: 38, r: 30, opacity: 0.4, part: "sun" },
    { kind: "circle", role: "apricot", cx: 196, cy: 38, r: 18, part: "sun" },
    { kind: "rect", role: "teal", x: 28, y: 58, width: 50, height: 94, rx: 14 },
    { kind: "rect", role: "tealSoft", x: 84, y: 86, width: 50, height: 66, rx: 14 },
    { kind: "rect", role: "sage", x: 140, y: 114, width: 50, height: 38, rx: 14 },
    { kind: "path", role: "dots", d: "M86 52C122 54 158 70 186 98" },
    { kind: "circle", role: "accent", cx: 53, cy: 82, r: 8 },
    { kind: "path", role: "leaf", d: "M206 150c12 0 18-6 18-16-11 0-18 5-18 16z" },
  ],
  /** Potted sprout waiting for pension pots and contributions. */
  "empty-pension": [
    groundShape,
    { kind: "circle", role: "apricot", cx: 192, cy: 42, r: 32, opacity: 0.4, part: "sun" },
    { kind: "circle", role: "apricot", cx: 192, cy: 42, r: 19, part: "sun" },
    { kind: "path", role: "dots", d: "M36 112C44 82 62 62 90 52" },
    { kind: "rect", role: "sage", x: 30, y: 136, width: 40, height: 14, rx: 7 },
    { kind: "rect", role: "tealSoft", x: 36, y: 120, width: 40, height: 14, rx: 7 },
    { kind: "path", role: "stem", d: "M120 88V44", part: "sprout" },
    {
      kind: "path",
      role: "sage",
      d: "M120 64c-18 0-27-9-27-24 17 0 27 9 27 24z",
      part: "sprout",
    },
    {
      kind: "path",
      role: "leaf",
      d: "M120 52c16 0 24-7 24-21-16 0-24 7-24 21z",
      part: "sprout",
    },
    { kind: "rect", role: "teal", x: 84, y: 94, width: 72, height: 58, rx: 18 },
    { kind: "rect", role: "tealSoft", x: 76, y: 84, width: 88, height: 18, rx: 9 },
    { kind: "circle", role: "accent", cx: 120, cy: 126, r: 9 },
  ],
  /** Monthly calendar card highlighting today's balance check-in. */
  "check-in": checkInBaseShapes,
  /** Completed monthly calendar card stamped with a confirmation tick. */
  "check-in-done": [
    ...checkInBaseShapes,
    { kind: "circle", role: "teal", cx: 172, cy: 132, r: 20 },
    { kind: "path", role: "tick", d: "M163 132l6.5 6.5L182 125" },
  ],
  /** Three rising steps with a sprout: the start of something. */
  onboarding: [
    groundShape,
    { kind: "circle", role: "apricot", cx: 190, cy: 40, r: 34, opacity: 0.4, part: "sun" },
    { kind: "circle", role: "apricot", cx: 190, cy: 40, r: 20, part: "sun" },
    { kind: "path", role: "dots", d: "M52 96C80 62 118 54 148 44" },
    { kind: "rect", role: "sage", x: 26, y: 108, width: 52, height: 44, rx: 14 },
    { kind: "rect", role: "tealSoft", x: 84, y: 84, width: 52, height: 68, rx: 14 },
    { kind: "rect", role: "teal", x: 142, y: 58, width: 52, height: 94, rx: 14 },
    ...budgetSproutShapes,
  ],
  /** A signpost that points two ways, for pages that cannot be found. */
  "not-found": [
    groundShape,
    { kind: "circle", role: "apricot", cx: 44, cy: 44, r: 28, opacity: 0.4, part: "sun" },
    { kind: "circle", role: "apricot", cx: 44, cy: 44, r: 16, part: "sun" },
    { kind: "rect", role: "teal", x: 115, y: 46, width: 10, height: 104, rx: 5 },
    { kind: "path", role: "tealSoft", d: "M120 52h64l16 14-16 14h-64z" },
    { kind: "path", role: "sage", d: "M120 90H64L48 104l16 14h56z" },
    { kind: "path", role: "leaf", d: "M82 148c-12 0-18-6-18-16 11 0 18 5 18 16z" },
    { kind: "path", role: "dots", d: "M150 128C170 128 186 122 200 112" },
  ],
};

function renderSceneShape(shape: SceneShape, key: number): ReactNode {
  const className = c[shape.role];
  switch (shape.kind) {
    case "ellipse":
      return (
        <ellipse
          key={key}
          className={className}
          cx={shape.cx}
          cy={shape.cy}
          opacity={shape.opacity}
          rx={shape.rx}
          ry={shape.ry}
        />
      );
    case "circle":
      return (
        <circle
          key={key}
          className={className}
          cx={shape.cx}
          cy={shape.cy}
          opacity={shape.opacity}
          r={shape.r}
        />
      );
    case "rect":
      return (
        <rect
          key={key}
          className={className}
          height={shape.height}
          opacity={shape.opacity}
          rx={shape.rx}
          transform={shape.transform}
          width={shape.width}
          x={shape.x}
          y={shape.y}
        />
      );
    case "path":
      return <path key={key} className={className} d={shape.d} opacity={shape.opacity} />;
  }
}

/**
 * Renders a plain shape list, grouping contiguous `sun` or `sprout` shapes in `<g data-scene-part>`
 * so motion hooks can target only those gentle ambient parts.
 */
export const SceneShapeList: FC<{ shapes: readonly SceneShape[] }> = ({ shapes }) => {
  const nodes: ReactNode[] = [];
  for (let i = 0; i < shapes.length; ) {
    const part = shapes[i]?.part;
    if (!part) {
      nodes.push(renderSceneShape(shapes[i]!, i));
      i += 1;
      continue;
    }
    const grouped: ReactNode[] = [];
    const groupKey = i;
    while (i < shapes.length && shapes[i]?.part === part) {
      grouped.push(renderSceneShape(shapes[i]!, i));
      i += 1;
    }
    nodes.push(
      <g key={`part-${part}-${groupKey}`} data-scene-part={part}>
        {grouped}
      </g>,
    );
  }
  return <>{nodes}</>;
};

export const illustrationScenes = Object.keys(sceneDefinitions) as IllustrationScene[];
