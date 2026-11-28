/*
 * PROTOTYPE ONLY (app design prototypes branch, never merged): the icon options side by side, in
 * light and dark, at 16, 20, 24 and 40px, so legibility at small sizes can be judged by eye.
 */
import {
  ChartLine,
  CreditCard,
  HandCoins,
  House as HomeIcon,
  House,
  Landmark,
  LayoutGrid,
  type LucideIcon,
  PiggyBank,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => [{ title: "Icon options | Flump" }];

const GLYPHS: ReadonlyArray<{ icon: LucideIcon; tone: string; name: string }> = [
  { icon: Wallet, tone: "sage", name: "Current account" },
  { icon: PiggyBank, tone: "sage", name: "Savings" },
  { icon: ChartLine, tone: "sage", name: "Investments" },
  { icon: ShieldCheck, tone: "sky", name: "Pension" },
  { icon: House, tone: "apricot", name: "Mortgage" },
  { icon: CreditCard, tone: "apricot", name: "Credit card" },
  { icon: HandCoins, tone: "apricot", name: "Loan" },
  { icon: Landmark, tone: "accent", name: "Accounts (navigation)" },
  { icon: LayoutGrid, tone: "teal", name: "Your sections (header)" },
  { icon: HomeIcon, tone: "teal", name: "Home (navigation)" },
];

const SIZES = [16, 20, 24, 40] as const;

const OPTIONS = [
  {
    id: "today",
    name: "Today",
    note: "For comparison: the tinted rounded square with a line glyph.",
    drawings: "None (library)",
  },
  {
    id: "orb",
    name: "1. Glass orb",
    note: "A tiny glass orb, our own pre-rendered three.js sprite in the area's tone, carrying the library glyph in white.",
    drawings: "None new: four orb sprites (already made) plus the Lucide glyphs",
  },
  {
    id: "cluster",
    name: "2. Orb cluster",
    note: "No glyph: one to three small glass beads arranged to mean the section, like the logo's three bubbles (coins in a row, a climbing stack, a large bead with a small one in orbit, two apart).",
    drawings: "One arrangement per section, about 10, drawn in CSS here; no icon set",
  },
  {
    id: "docs",
    name: "3. Paper document",
    note: "The icon is a miniature paper document: a card, a passbook, a statement with its round mark, a slip.",
    drawings: "Six to eight bespoke miniatures (SVG); a paper tile with the glyph for the rest",
  },
  {
    id: "stamp",
    name: "4. Stamp",
    note: "An embossed paper seal with a ring, the glyph pressed into it.",
    drawings: "None new: a CSS seal and the Lucide glyphs; a bespoke deboss set would be about 40",
  },
  {
    id: "clay",
    name: "5. Clay",
    note: "A soft hand-pressed pebble in the area's tint with a thicker glyph.",
    drawings: "None new; production would want one hand-modelled shape per area (about 9)",
  },
  {
    id: "hand",
    name: "6. Hand line",
    note: "A single-weight hand-drawn line. Approximated here by wobbling the library glyphs; the real thing is a drawn set.",
    drawings: "A full bespoke set, about 40 glyphs, drawn by hand",
  },
  {
    id: "dots",
    name: "7. No icon",
    note: "A dot in the area's colour; the words do the work. Calmest, smallest, works at every size.",
    drawings: "None",
  },
] as const;

const Tile = ({ icon: Icon, tone, size }: { icon: LucideIcon; tone: string; size: number }) => (
  <span className="proto-sheet__tile" data-tile-tone={tone} style={{ width: size, height: size }}>
    <Icon aria-hidden="true" size={Math.round(size * 0.6)} strokeWidth={size <= 20 ? 2 : 1.75} />
  </span>
);

const Panel = ({ option, dark }: { option: string; dark: boolean }) => (
  <div
    className={`proto-sheet__panel${dark ? " dark" : ""}`}
    data-proto-icons-scope={option === "today" ? undefined : option}
    data-proto-sheet-today={option === "today" ? "" : undefined}
    data-theme={dark ? "dark" : undefined}
  >
    <p className="proto-sheet__panel-title">{dark ? "Dark (Midnight)" : "Light (mint)"}</p>
    <table className="proto-sheet__table">
      <thead>
        <tr>
          <th scope="col">Glyph</th>
          {SIZES.map((s) => (
            <th key={s} scope="col">
              {s}px
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {GLYPHS.map((g) => (
          <tr key={g.name}>
            <th scope="row">{g.name}</th>
            {SIZES.map((s) => (
              <td key={s}>
                <Tile icon={g.icon} size={s} tone={g.tone} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function PrototypeIcons() {
  return (
    <div className="proto-sheet">
      <h1>Icon options</h1>
      <p className="proto-index__lead">
        Seven directions from the site's own objects, at the sizes the app uses. Colour names the
        area only: debt is apricot (violet for an orb), never rose. Choose one on any screen with
        the Icons switch in the prototype control.
      </p>
      {OPTIONS.map((o) => (
        <section aria-labelledby={`opt-${o.id}`} className="proto-sheet__option" key={o.id}>
          <h2 id={`opt-${o.id}`}>{o.name}</h2>
          <p className="proto-index__note">
            {o.note} Bespoke drawings: {o.drawings}.
          </p>
          <div className="proto-sheet__panels">
            <Panel dark={false} option={o.id} />
            <Panel dark option={o.id} />
          </div>
        </section>
      ))}
    </div>
  );
}
