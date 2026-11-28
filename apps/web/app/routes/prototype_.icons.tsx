/*
 * PROTOTYPE ONLY (app design prototypes branch, never merged): the icon options side by side, in
 * light and dark, at 16, 20, 24 and 40px, so legibility at small sizes can be judged by eye.
 */
import {
  ChartLine,
  CreditCard,
  HandCoins,
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
    id: "paper",
    name: "1. Paper",
    note: "A ruled paper tile with a crisp edge and a top rule in the area's colour; the library glyph in the area's ink.",
    drawings: "None: the Lucide glyphs on a CSS tile",
  },
  {
    id: "tab",
    name: "2. Tab",
    note: "The “Check-in day” label: flat paper with a coloured left edge; the glyph in plain ink.",
    drawings: "None: the Lucide glyphs on a CSS tile",
  },
  {
    id: "cut",
    name: "3. Cut paper",
    note: "A solid flat tile in the pictures' mint (Midnight in dark) with a round seal in the area's colour stuck on its corner.",
    drawings: "None: the Lucide glyphs on a CSS tile",
  },
  {
    id: "seal",
    name: "4. Seal",
    note: "No box: the statements' round mark in the area's tint behind the glyph, two-tone and flat.",
    drawings: "None: the Lucide glyphs over a CSS circle",
  },
  {
    id: "mini",
    name: "5. Mini documents",
    note: "Each account type as a tiny version of its picture: card, mint credit card, passbook, statement with a line, statement with the round mark, loan slip. Others fall back to option 1.",
    drawings:
      "Six bespoke drawings (drawn in CSS here; SVG in production), plus option 1 for the rest",
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
        Five flat options drawn from the document pictures, at the sizes the app uses. Colour names
        the area only: debt is apricot, never rose. Choose an option on any screen with the Icons
        switch in the prototype control.
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
