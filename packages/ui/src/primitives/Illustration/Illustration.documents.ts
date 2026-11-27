/**
 * Document card pictures (STYLE-GUIDE 8.3, slice F3): tilted cards and paper documents with
 * sample content and an "Example" tag, redrawn from prototype 11's picture set as plain shape
 * lists (STYLE-GUIDE IL4).
 *
 * This file is pure data with no imports, so the web (`DocumentShapeList`, SVG) and the mobile app
 * (`react-native-svg`, slice S9b, through `@repo/ui/illustration-data`) draw the same list. Every
 * position is in a 300-wide grid (`DOCUMENT_GRID_WIDTH`); a picture is never drawn narrower than
 * `DOCUMENT_MIN_WIDTH` CSS pixels, so its smallest text (`DOCUMENT_MIN_TEXT`) never falls under
 * 12px. Colours are roles, mapped to semantic tokens in `documentRoleTokens`.
 */

/** The grid every document picture is drawn in. */
export const DOCUMENT_GRID_WIDTH = 300;
/** The narrowest a document picture is ever drawn, in CSS pixels. */
export const DOCUMENT_MIN_WIDTH = 280;
/** The smallest text size in the grid: 13 grid units is 12.1px at the narrowest width. */
export const DOCUMENT_MIN_TEXT = 13;

/** The "Example" tag: real text, never drawn as shapes. */
export const EXAMPLE_TAG = { text: "Example", width: 66, height: 22, size: 13 } as const;

/** What a card or a filled shape is made of. Each surface has the inks that clear AA on it. */
/** `mark` is a graphic-only fill (a seal): no text ever sits on it. */
export type DocumentSurface = "paper" | "charcoal" | "mint" | "soft" | "band" | "mark";
export type DocumentInk = "ink" | "inkSecondary" | "primary" | "onCharcoal" | "onBand";
export type DocumentFill = DocumentSurface | "line" | "primary" | "tag" | "markOnCharcoal";
export type DocumentStroke = "edge" | "rule" | "slot" | "primary" | "onBand" | "onCharcoal";

/**
 * The marketing home page's opt-in look (`palette="orb"` on the `Illustration` document variant):
 * prototype 11's colours on the few shapes F3 recoloured under rule MC1. A marked shape keeps its
 * default role everywhere else, so the apps never see these. Tokens are in
 * `documentOrbRoleTokens` (`Illustration.styles.ts`, the one file allowed the orb colours).
 * - `violet` and `rose`: a graphic fill or line (the pension mark and rule, the ticket's top band,
 *   the check-in tab's edge). No text sits on them.
 * - `teal`: a fill words sit on (the calendar band, the question bubble), with `onBand` ink.
 * - `violetTint` and `tealTint`: a piece's own fill (the not-found tabs), with `ink` text.
 */
export type DocumentOrbAccent = "violet" | "rose" | "teal" | "violetTint" | "tealTint";

/** Which look a document picture is drawn in: the apps' (default) or the opt-in orb colours. */
export type DocumentPalette = "app" | "orb";

/** The inks allowed on each orb accent that text sits on (checked in `Illustration.test.tsx`). */
export const documentOrbInksByAccent: Record<DocumentOrbAccent, readonly DocumentInk[]> = {
  violet: [],
  rose: [],
  teal: ["onBand"],
  violetTint: ["ink", "inkSecondary"],
  tealTint: ["ink", "inkSecondary"],
};

/** Semantic token for each role. The web maps them in `documentClasses`; mobile reads its theme. */
export const documentRoleTokens = {
  surface: {
    paper: "material.paper.fill",
    charcoal: "surface.contrast",
    mint: "primary.subtle",
    soft: "primary.subtle",
    // Text sits on the band, so it is the text-bearing fill (ui-laws section 2), not `primary`.
    band: "primary.solid",
    mark: "primary",
  },
  ink: {
    ink: "text.primary",
    inkSecondary: "text.secondary",
    primary: "primary",
    onCharcoal: "text.onContrast",
    onBand: "primary.foreground",
  },
  // Any surface can also fill a plain shape (the calendar band's square-off corner).
  fill: {
    paper: "material.paper.fill",
    charcoal: "surface.contrast",
    mint: "primary.subtle",
    soft: "primary.subtle",
    band: "primary.solid",
    mark: "primary",
    line: "border",
    primary: "primary",
    tag: "surface.sunken",
    markOnCharcoal: "text.onContrast",
  },
  stroke: {
    edge: "material.paper.edge",
    rule: "border",
    slot: "border.strong",
    primary: "primary",
    onBand: "primary.foreground",
    onCharcoal: "text.onContrast",
  },
} as const;

/**
 * The effects a drawer needs beyond the roles, so the web and mobile draw them alike. The web's
 * Panda classes (`documentClasses`) hold the same numbers; `Illustration.test.tsx` checks them.
 */
export const documentEffects = {
  /** A soft drop under each piece: inset from its sides, moved down, blurred, faint. */
  shadow: {
    token: "surface.contrast",
    inset: 6,
    offsetY: 10,
    blur: 8,
    opacity: { light: 0.14, dark: 0.6 },
  },
  /** The "Example" tag: on paper a sunken pill with a hairline; on charcoal an outline only. */
  tag: {
    fill: "surface.sunken",
    edge: "border",
    ink: "text.secondary",
    onCharcoalInk: "text.onContrast",
    onCharcoalEdgeOpacity: 0.6,
  },
  /** The `onCharcoal` stroke (the chip's contact lines) is drawn at half strength. */
  onCharcoalStrokeOpacity: 0.5,
  /** Dashed lines: dash and gap, in grid units. */
  dash: [3, 3],
} as const;

/** The inks allowed on each surface (every pair is in `PASSING_PAIRS`, `@flump/tokens`). */
export const documentInksBySurface: Record<DocumentSurface, readonly DocumentInk[]> = {
  paper: ["ink", "inkSecondary", "primary"],
  charcoal: ["onCharcoal"],
  mint: ["ink", "inkSecondary"],
  soft: ["ink", "inkSecondary"],
  band: ["onBand"],
  mark: [],
};

export interface DocumentText {
  kind: "text";
  x: number;
  /** Baseline of the first line. */
  y: number;
  /** One string per line: SVG text does not wrap. */
  lines: readonly string[];
  size: number;
  weight?: 400 | 500 | 600 | 700;
  ink: DocumentInk;
  anchor?: "start" | "middle" | "end";
  font?: "display" | "body";
  /** Figures: drawn with tabular numbers. */
  numeric?: boolean;
  lineHeight?: number;
}

/** The "Example" tag. `x` is its left edge (`anchor: "start"`) or right edge (`"end"`). */
export interface DocumentTag {
  kind: "tag";
  x: number;
  y: number;
  anchor: "start" | "end";
  tone: "paper" | "onCharcoal";
}

export interface DocumentRect {
  kind: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
  fill?: DocumentFill;
  stroke?: DocumentStroke;
  dashed?: boolean;
  opacity?: number;
  /** Takes this orb colour under `palette="orb"` only. */
  orb?: DocumentOrbAccent;
}

export interface DocumentCircle {
  kind: "circle";
  cx: number;
  cy: number;
  r: number;
  fill: DocumentFill;
  opacity?: number;
  /** Takes this orb colour under `palette="orb"` only. */
  orb?: DocumentOrbAccent;
}

export interface DocumentPath {
  kind: "path";
  d: string;
  fill?: DocumentFill;
  stroke?: DocumentStroke;
  strokeWidth?: number;
  dashed?: boolean;
  opacity?: number;
  /** Takes this orb colour under `palette="orb"` only. */
  orb?: DocumentOrbAccent;
}

/** A card or a sheet of paper: its own surface, tilted about its centre, holding shapes. */
export interface DocumentPiece {
  kind: "piece";
  x: number;
  y: number;
  width: number;
  height: number;
  /** Degrees, about the piece's centre. Six at most. */
  rotate: number;
  surface: DocumentSurface;
  rx?: number;
  /** A soft drop shadow under the piece. */
  shadow?: boolean;
  /** A hairline edge (paper and soft pieces). */
  edge?: boolean;
  /** A torn, zig-zag bottom edge (receipts). */
  torn?: boolean;
  /** No body of its own: only its shapes are drawn (an empty, dashed space). */
  bare?: boolean;
  /** Its body takes this orb colour under `palette="orb"` only. */
  orb?: DocumentOrbAccent;
  shapes: readonly DocumentShape[];
}

export type DocumentShape =
  | DocumentText
  | DocumentTag
  | DocumentRect
  | DocumentCircle
  | DocumentPath
  | DocumentPiece;

export interface DocumentPicture {
  /** Height in grid units; the width is always `DOCUMENT_GRID_WIDTH`. */
  height: number;
  /** What the picture shows, for stories and the image sheet. The picture itself is decorative. */
  subject: string;
  pieces: readonly DocumentPiece[];
}

/* ---------------------------------------------------------------------------------------------
 * Builders. Pure functions, so mobile can call them too.
 * ------------------------------------------------------------------------------------------- */

/** The zig-zag along a receipt's torn bottom edge, in the piece's own grid. */
export function tornEdgePath(width: number, height: number, tooth = 8): string {
  const teeth = Math.max(1, Math.round(width / tooth));
  const step = width / teeth;
  let d = `M0 ${height}`;
  for (let i = 0; i < teeth; i++) {
    d += ` L${(i * step + step / 2).toFixed(1)} ${height + tooth / 2} L${((i + 1) * step).toFixed(1)} ${height}`;
  }
  return `${d} Z`;
}

const text = (
  x: number,
  y: number,
  line: string | readonly string[],
  size: number,
  ink: DocumentInk,
  options: Omit<DocumentText, "kind" | "x" | "y" | "lines" | "size" | "ink"> = {},
): DocumentText => ({
  kind: "text",
  x,
  y,
  lines: typeof line === "string" ? [line] : line,
  size,
  ink,
  ...options,
});

const title = (x: number, y: number, line: string | readonly string[], size = 16) =>
  text(x, y, line, size, "ink", { weight: 700, font: "display" });

const tag = (x: number, y: number, tone: DocumentTag["tone"] = "paper"): DocumentTag => ({
  kind: "tag",
  x,
  y,
  anchor: "end",
  tone,
});

const rule = (x1: number, x2: number, y: number): DocumentPath => ({
  kind: "path",
  d: `M${x1} ${y}H${x2}`,
  stroke: "rule",
  strokeWidth: 1,
  dashed: true,
});

interface Row {
  label: string;
  value: string;
  /** The total row: bold, larger figure, no rule under it. */
  total?: boolean;
  /** A tick before the label (a finished check-in). */
  tick?: boolean;
}

/** A list of label and figure rows with dashed rules between them. */
function rows(
  x: number,
  right: number,
  top: number,
  list: readonly Row[],
  step = 29,
): DocumentShape[] {
  const out: DocumentShape[] = [];
  list.forEach((row, i) => {
    const y = top + i * step;
    const labelX = row.tick ? x + 22 : x;
    if (row.tick) {
      out.push({ kind: "circle", cx: x + 8, cy: y - 5, r: 8, fill: "primary" });
      out.push({
        kind: "path",
        d: `M${x + 4.5} ${y - 5}l2.5 2.5 4.5-5`,
        stroke: "onBand",
        strokeWidth: 2,
      });
    }
    out.push(
      text(labelX, y, row.label, 14, "ink", { weight: row.total ? 600 : 400 }),
      text(right, y, row.value, row.total ? 17 : 14, "ink", {
        weight: row.total ? 700 : 600,
        anchor: "end",
        numeric: true,
        font: row.total ? "display" : "body",
      }),
    );
    if (i < list.length - 1) out.push(rule(x, right, y + 10));
  });
  return out;
}

const piece = (
  x: number,
  y: number,
  width: number,
  height: number,
  rotate: number,
  surface: DocumentSurface,
  shapes: readonly DocumentShape[],
  options: Partial<Pick<DocumentPiece, "rx" | "shadow" | "edge" | "torn" | "bare" | "orb">> = {},
): DocumentPiece => ({
  kind: "piece",
  x,
  y,
  width,
  height,
  rotate,
  surface,
  shadow: true,
  edge: surface === "paper" || surface === "soft" || surface === "mint",
  rx: surface === "charcoal" || surface === "mint" ? 14 : 6,
  ...options,
  shapes,
});

/** A blank sheet under the main one, for depth. */
const underSheet = (x: number, y: number, width: number, height: number, rotate: number) =>
  piece(x, y, width, height, rotate, "paper", []);

/** The chip on a savings card: a rounded square with its contact lines. */
const chip = (x: number, y: number): DocumentShape[] => [
  { kind: "rect", x, y, width: 28, height: 22, rx: 5, fill: "markOnCharcoal", opacity: 0.55 },
  {
    kind: "path",
    d: `M${x + 9.5} ${y}v22M${x + 18.5} ${y}v22M${x} ${y + 11}h28`,
    stroke: "onCharcoal",
    strokeWidth: 1,
  },
];

/** The two overlapping discs on a credit card. */
const discs = (x: number, y: number): DocumentShape[] => [
  { kind: "circle", cx: x, cy: y, r: 10, fill: "primary", opacity: 0.45 },
  { kind: "circle", cx: x + 14, cy: y, r: 10, fill: "primary", opacity: 0.3 },
];

/** A diagonal light across a card's face. */
const cardSheen = (width: number, height: number): DocumentPath => ({
  kind: "path",
  d: `M${width * 0.42} 0H${width * 0.62}L${width * 0.38} ${height}H${width * 0.18}Z`,
  fill: "markOnCharcoal",
  opacity: 0.07,
});

/* ---------------------------------------------------------------------------------------------
 * Shared pieces.
 * ------------------------------------------------------------------------------------------- */

function savingsCard(
  x: number,
  y: number,
  width: number,
  height: number,
  rotate: number,
): DocumentPiece {
  return piece(x, y, width, height, rotate, "charcoal", [
    cardSheen(width, height),
    text(18, 32, "Cash and savings", 14, "onCharcoal", { weight: 600, font: "display" }),
    tag(width - 12, 16, "onCharcoal"),
    ...chip(18, 48),
    text(18, height - 34, "£21,000", 30, "onCharcoal", {
      weight: 700,
      font: "display",
      numeric: true,
    }),
    text(18, height - 14, "3.5% AER", 13, "onCharcoal", { numeric: true }),
  ]);
}

function creditCard(
  x: number,
  y: number,
  width: number,
  height: number,
  rotate: number,
  options: { figure?: boolean; meta?: string } = {},
): DocumentPiece {
  const shapes: DocumentShape[] = [
    text(18, 32, "Credit card", 15, "ink", { weight: 600, font: "display" }),
    ...discs(28, 58),
  ];
  // A card with no figure carries no tag (STYLE-GUIDE 8.3).
  if (options.figure !== false) {
    shapes.push(
      tag(width - 14, 16),
      text(18, height - 34, "£1,800", 30, "ink", { weight: 700, font: "display", numeric: true }),
      text(18, height - 14, options.meta ?? "22.9% APR", 13, "inkSecondary", { numeric: true }),
    );
  }
  return piece(x, y, width, height, rotate, "mint", shapes);
}

/* ---------------------------------------------------------------------------------------------
 * The owner's picks (27 November 2026). Subjects are from the prototype's image sheet.
 * ------------------------------------------------------------------------------------------- */

export type DocumentScene =
  | "empty-accounts"
  | "empty-goals"
  | "empty-savings"
  | "empty-debt"
  | "empty-pension"
  | "check-in"
  | "check-in-done"
  | "onboarding"
  | "not-found"
  | "feature-accounts"
  | "feature-budget"
  | "feature-pay"
  | "feature-savings-pension"
  | "feature-debt"
  | "feature-ai-connection"
  | "security";

const CHECK_ROWS = [
  { label: "Cash and savings", value: "£21,000" },
  { label: "Pension", value: "£96,000" },
  { label: "Credit card", value: "£1,800" },
] as const;

export const documentDefinitions: Record<DocumentScene, DocumentPicture> = {
  /** A: stacked cards, nothing linked yet, a space for the next one. */
  "empty-accounts": {
    height: 230,
    subject: "Stacked cards, nothing linked yet",
    pieces: [
      piece(
        150,
        6,
        142,
        112,
        0,
        "paper",
        [
          {
            kind: "rect",
            x: 0,
            y: 0,
            width: 142,
            height: 112,
            rx: 12,
            stroke: "slot",
            dashed: true,
          },
        ],
        { bare: true },
      ),
      creditCard(74, 20, 222, 126, 4, { figure: false }),
      savingsCard(6, 82, 222, 128, -3),
      piece(
        196,
        196,
        100,
        26,
        0,
        "paper",
        [text(50, 18, "No bank login", 13, "ink", { weight: 600, anchor: "middle" })],
        { rx: 13 },
      ),
    ],
  },

  /** A: a blank "New goal" slip with a flag. No figures, so no tag. */
  "empty-goals": {
    height: 220,
    subject: "A blank goal slip with a flag",
    pieces: [
      piece(46, 44, 208, 160, -3, "paper", [
        { kind: "path", d: "M178 4V-40", stroke: "slot", strokeWidth: 2 },
        { kind: "path", d: "M178 -40l32 9-32 9z", fill: "primary" },
        title(18, 34, "New goal"),
        text(18, 68, "Target", 14, "ink"),
        { kind: "rect", x: 74, y: 50, width: 116, height: 24, rx: 5, stroke: "slot", dashed: true },
        text(18, 102, "By", 14, "ink"),
        { kind: "rect", x: 74, y: 84, width: 116, height: 24, rx: 5, stroke: "slot", dashed: true },
        { kind: "rect", x: 18, y: 120, width: 172, height: 6, rx: 3, fill: "line" },
        text(18, 148, "Not started yet", 13, "inkSecondary"),
      ]),
    ],
  },

  /** B: one savings statement card with its year as a line. */
  "empty-savings": {
    height: 220,
    subject: "A savings statement with its year as a line",
    pieces: [
      piece(30, 14, 244, 192, -2, "paper", [
        text(18, 32, "Cash and savings", 15, "ink", { weight: 600, font: "display" }),
        tag(230, 16),
        text(18, 70, "£21,000", 28, "ink", { weight: 700, font: "display", numeric: true }),
        {
          kind: "path",
          d: "M18 122L62 114L104 106L146 96L170 104L226 88",
          stroke: "primary",
          strokeWidth: 2,
        },
        ...rows(18, 226, 152, [
          { label: "Interest", value: "3.5% AER" },
          { label: "Added each month", value: "£300" },
        ]),
      ]),
    ],
  },

  /** A: the credit card with a "Paying off" slip. */
  "empty-debt": {
    height: 230,
    subject: "The credit card with a paying-off slip",
    pieces: [
      creditCard(6, 12, 196, 124, -4),
      piece(
        126,
        62,
        168,
        146,
        3,
        "paper",
        [
          title(14, 30, "Paying off", 15),
          tag(156, 14),
          ...rows(14, 154, 62, [
            { label: "Nov 2026", value: "£9,000" },
            // More than a year ahead: a projection, so "~" (UX-GUIDELINES B9).
            { label: "Jan 2028", value: "~£6,000" },
            { label: "Feb 2030", value: "£0", total: true },
          ]),
        ],
        { torn: true },
      ),
    ],
  },

  /** A: a pension statement. */
  "empty-pension": {
    height: 220,
    subject: "A pension statement",
    pieces: [
      underSheet(70, 26, 206, 164, 4),
      piece(30, 14, 236, 180, -2, "paper", [
        { kind: "circle", cx: 26, cy: 28, r: 10, fill: "primary", orb: "violet" },
        { kind: "rect", x: 44, y: 20, width: 92, height: 5, rx: 2.5, fill: "line" },
        { kind: "rect", x: 44, y: 31, width: 62, height: 5, rx: 2.5, fill: "line" },
        tag(222, 16),
        { kind: "path", d: "M16 50H220", stroke: "primary", strokeWidth: 2, orb: "violet" },
        title(18, 78, "Pension statement", 15),
        ...rows(18, 218, 110, [
          { label: "Pot value", value: "£96,000", total: true },
          { label: "You pay in", value: "5% of salary" },
          { label: "Each month", value: "£216.67" },
        ]),
      ]),
    ],
  },

  /** B: a calendar page for 26 November with a "Check-in day" tab. A date, not a figure: no tag. */
  "check-in": {
    height: 220,
    subject: "A calendar page with a check-in day tab",
    pieces: [
      underSheet(112, 22, 142, 150, 5),
      piece(76, 14, 142, 160, -3, "paper", [
        {
          kind: "piece",
          x: 0,
          y: 0,
          width: 142,
          height: 44,
          rotate: 0,
          surface: "band",
          rx: 6,
          orb: "teal",
          shapes: [
            // Squares off the band's lower corners where it meets the page.
            { kind: "rect", x: 0, y: 30, width: 142, height: 14, fill: "band", orb: "teal" },
            text(71, 29, "November", 16, "onBand", {
              weight: 700,
              anchor: "middle",
              font: "display",
            }),
          ],
        },
        text(71, 110, "26", 52, "ink", {
          weight: 700,
          anchor: "middle",
          font: "display",
          numeric: true,
        }),
        text(71, 138, "Thursday", 13, "inkSecondary", { anchor: "middle" }),
      ]),
      piece(
        176,
        164,
        120,
        32,
        6,
        "paper",
        [
          { kind: "rect", x: 0, y: 0, width: 4, height: 32, fill: "primary", orb: "rose" },
          text(16, 21, "Check-in day", 14, "ink", { weight: 700, font: "display" }),
        ],
        { rx: 4 },
      ),
    ],
  },

  /** A: the monthly check-in slip, ticked. */
  "check-in-done": {
    height: 220,
    subject: "The monthly check-in slip, ticked",
    pieces: [
      underSheet(78, 22, 196, 160, 4),
      piece(22, 14, 256, 184, -2, "paper", [
        title(18, 34, "Monthly check-in", 16),
        tag(242, 16),
        ...rows(
          18,
          238,
          70,
          CHECK_ROWS.map((row) => ({ ...row, tick: true })),
        ),
        text(18, 162, "Updated 26 November", 13, "inkSecondary"),
      ]),
    ],
  },

  /** B: the "Getting started" ticket in three parts. */
  onboarding: {
    height: 210,
    subject: "A getting started ticket in three parts",
    pieces: [
      piece(8, 24, 284, 164, -2, "paper", [
        {
          kind: "path",
          d: "M0 6a6 6 0 0 1 6-6H278a6 6 0 0 1 6 6V7H0Z",
          fill: "primary",
          orb: "violet",
        },
        title(16, 38, "Getting started", 16),
        tag(270, 20),
        {
          kind: "path",
          d: "M100 58V150M192 58V150",
          stroke: "slot",
          strokeWidth: 1.5,
          dashed: true,
        },
        text(16, 82, "1", 24, "primary", { weight: 700, font: "display", numeric: true }),
        text(16, 106, ["Rough", "figures"], 14, "ink", { weight: 700, lineHeight: 17 }),
        text(16, 146, "£3,249 in", 13, "inkSecondary", { numeric: true }),
        text(110, 82, "2", 24, "primary", { weight: 700, font: "display", numeric: true }),
        text(110, 106, ["Your", "picture"], 14, "ink", { weight: 700, lineHeight: 17 }),
        text(110, 146, ["£232,000", "net worth"], 13, "inkSecondary", {
          numeric: true,
          lineHeight: 15,
        }),
        text(202, 82, "3", 24, "primary", { weight: 700, font: "display", numeric: true }),
        text(202, 106, "Check in", 14, "ink", { weight: 700 }),
        text(202, 128, ["Once a", "month"], 13, "inkSecondary", { lineHeight: 15 }),
      ]),
    ],
  },

  /** B: a "Where next?" card with two direction tabs. No figures, so no tag. */
  "not-found": {
    height: 210,
    subject: "A card with two direction tabs",
    pieces: [
      piece(70, 10, 180, 136, -2, "paper", [
        title(18, 36, "Where next?", 16),
        { kind: "rect", x: 18, y: 54, width: 144, height: 7, rx: 3.5, fill: "line" },
        { kind: "rect", x: 18, y: 70, width: 112, height: 7, rx: 3.5, fill: "line" },
      ]),
      piece(
        6,
        140,
        158,
        36,
        -4,
        "soft",
        [
          { kind: "path", d: "M26 18H14M19 12l-6 6 6 6", stroke: "primary", strokeWidth: 2 },
          text(36, 23, "Flump features", 14, "ink", { weight: 700, font: "display" }),
        ],
        { rx: 7, orb: "violetTint" },
      ),
      piece(
        168,
        128,
        126,
        36,
        4,
        "soft",
        [
          text(14, 23, "Home page", 14, "ink", { weight: 700, font: "display" }),
          { kind: "path", d: "M100 18H112M107 12l6 6-6 6", stroke: "primary", strokeWidth: 2 },
        ],
        { rx: 7, orb: "tealTint" },
      ),
    ],
  },

  /* -------------------------------------------------------------------------------------------
   * Feature tiles: one small piece per area, as drawn.
   * ----------------------------------------------------------------------------------------- */

  "feature-accounts": {
    height: 200,
    subject: "A cash and savings card",
    pieces: [savingsCard(16, 14, 268, 168, -2)],
  },

  "feature-budget": {
    height: 200,
    subject: "This month's budget slip",
    pieces: [
      piece(
        48,
        12,
        204,
        162,
        2,
        "paper",
        [
          title(16, 32, "This month", 16),
          tag(190, 15),
          ...rows(16, 188, 66, [
            { label: "Comes in", value: "£3,249" },
            { label: "Goes out", value: "£2,610" },
            { label: "Left over", value: "£639", total: true },
          ]),
        ],
        { torn: true },
      ),
    ],
  },

  "feature-pay": {
    height: 200,
    subject: "A payslip",
    pieces: [
      piece(26, 12, 248, 172, -1, "paper", [
        { kind: "path", d: "M12 14H236", stroke: "slot", strokeWidth: 1, dashed: true },
        title(16, 44, "Payslip", 16),
        tag(234, 28),
        ...rows(16, 232, 76, [
          { label: "Salary a year", value: "£52,000" },
          { label: "Gross this month", value: "£4,333" },
          { label: "Net pay", value: "£3,249", total: true },
        ]),
      ]),
    ],
  },

  /** Option B: one statement, cash and savings, pension, together. */
  "feature-savings-pension": {
    height: 200,
    subject: "One statement: cash and savings, pension, together",
    pieces: [
      underSheet(60, 26, 222, 146, 4),
      piece(12, 14, 276, 156, -2, "paper", [
        title(16, 34, "Savings and pension", 16),
        tag(262, 17),
        ...rows(16, 258, 70, [
          { label: "Cash and savings", value: "£21,000" },
          { label: "Pension", value: "£96,000" },
          { label: "Together", value: "£117,000", total: true },
        ]),
      ]),
    ],
  },

  "feature-debt": {
    height: 200,
    subject: "A credit card",
    pieces: [creditCard(16, 14, 268, 168, -2, { meta: "22.9% APR, £60 a month" })],
  },

  "feature-ai-connection": {
    height: 240,
    subject: "A question about your figures and its answer",
    pieces: [
      piece(24, 10, 252, 216, -2, "paper", [
        title(16, 32, ["Ask about your", "figures"], 16),
        tag(238, 16),
        {
          kind: "piece",
          x: 44,
          y: 66,
          width: 192,
          height: 70,
          rotate: 0,
          surface: "band",
          rx: 10,
          orb: "teal",
          shapes: [
            text(96, 24, ["How long would my", "savings cover the", "essentials?"], 13, "onBand", {
              weight: 600,
              anchor: "middle",
              lineHeight: 17,
            }),
          ],
        },
        {
          kind: "piece",
          x: 16,
          y: 144,
          width: 186,
          height: 62,
          rotate: 0,
          surface: "soft",
          rx: 10,
          shapes: [
            text(93, 22, ["About 10.2 months,", "from your saved figures."], 13, "ink", {
              weight: 600,
              anchor: "middle",
              numeric: true,
              lineHeight: 17,
            }),
          ],
        },
      ]),
    ],
  },

  /** The security card: what Flump can and cannot do, with a seal. No figures, so no tag. */
  security: {
    height: 210,
    subject: "A card that says what Flump can and cannot do",
    pieces: [
      piece(14, 26, 240, 164, 0, "paper", [
        { kind: "circle", cx: 28, cy: 30, r: 11, fill: "primary" },
        title(48, 36, "Your figures", 16),
        { kind: "path", d: "M18 54H222", stroke: "primary", strokeWidth: 2 },
        ...rows(18, 222, 86, [
          { label: "Bank login", value: "Not needed" },
          { label: "Payments", value: "None" },
          { label: "Typed in by", value: "You", total: true },
        ]),
      ]),
      piece(
        224,
        4,
        64,
        64,
        0,
        "mark",
        [
          {
            kind: "path",
            d: "M32 15l13 5.5v9.5c0 8.3-5.5 15.1-13 18.5-7.5-3.4-13-10.2-13-18.5V20.5z",
            stroke: "onBand",
            strokeWidth: 2.5,
          },
          { kind: "path", d: "M26 32l4.5 4.5 8-8.5", stroke: "onBand", strokeWidth: 2.5 },
        ],
        { rx: 32 },
      ),
    ],
  },
};

/** The owner's nine picked scene pictures, in the flat scenes' order. */
export const documentSceneIds = [
  "empty-accounts",
  "empty-goals",
  "empty-savings",
  "empty-debt",
  "empty-pension",
  "check-in",
  "check-in-done",
  "onboarding",
  "not-found",
] as const satisfies readonly DocumentScene[];

/** The features tiles' pictures and the security card. */
export const documentExtraIds = [
  "feature-accounts",
  "feature-budget",
  "feature-pay",
  "feature-savings-pension",
  "feature-debt",
  "feature-ai-connection",
  "security",
] as const satisfies readonly DocumentScene[];

export const documentScenes: readonly DocumentScene[] = [...documentSceneIds, ...documentExtraIds];

/** Every shape in a picture, with the surface it sits on, depth first. */
export function walkDocument(
  picture: DocumentPicture,
): { shape: DocumentShape; surface: DocumentSurface; piece: DocumentPiece }[] {
  const out: { shape: DocumentShape; surface: DocumentSurface; piece: DocumentPiece }[] = [];
  const visit = (p: DocumentPiece) => {
    for (const shape of p.shapes) {
      out.push({ shape, surface: p.surface, piece: p });
      if (shape.kind === "piece") visit(shape);
    }
  };
  for (const p of picture.pieces) visit(p);
  return out;
}
