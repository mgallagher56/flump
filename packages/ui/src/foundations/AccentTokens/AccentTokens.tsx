import { CalendarCheck } from "lucide-react";
import type { FC } from "react";
import { css } from "../../../styled-system/css";
import { Icon } from "../../primitives/Icon";
import {
  accentCard,
  accentFills,
  accentGrid,
  accentLine,
  accentPage,
  accentTile,
  heroSample,
  heroSun,
  plainCard,
  primaryLine,
  swatchChip,
  swatchRow,
} from "./AccentTokens.styles";

const ACCENT_TOKENS = [
  { token: "accent", note: "Icons, shapes, lines; text on card, canvas and accent.subtle" },
  { token: "accent.subtle", note: "The one tinted card or section on a page" },
  { token: "accent.border", note: "Edge of an accent.subtle surface" },
  { token: "accent.onHero", note: "One sun shape on surface.hero, never text" },
  { token: "chart.accent", note: "One chart series, with a label and a dash" },
] as const;

/**
 * E17 accent ("Damson"): every permitted pairing in one place, so the tokens can be checked in
 * light and dark. The accent is decoration and wayfinding. It never colours a figure, a button, a
 * link or a notice, and it never says that anything about a person's money is good or bad.
 */
export const AccentTokens: FC = () => (
  <div className={accentPage()}>
    <div>
      <h1 className={css({ textStyle: "heading.lg" })}>Accent</h1>
      <p className={css({ textStyle: "body.sm", color: "text.muted", mt: "4px" })}>
        A soft plum used for decoration and wayfinding. Figures, buttons, links and notices never
        take it.
      </p>
    </div>

    <ul className={css({ display: "grid", gap: "8px" })}>
      {ACCENT_TOKENS.map(({ token, note }) => (
        <li className={swatchRow()} data-testid={`accent-token-${token}`} key={token}>
          <span aria-hidden="true" className={`${swatchChip()} ${accentFills[token]}`} />
          <code className={css({ fontFamily: "mono", fontSize: "xs" })}>{token}</code>
          <span className={css({ color: "text.muted" })}>{note}</span>
        </li>
      ))}
    </ul>

    <div className={accentGrid()}>
      <section className={accentCard()} data-testid="accent-sample-card">
        <div className={css({ display: "flex", alignItems: "center", gap: "8px" })}>
          <span className={accentTile()}>
            <Icon icon={CalendarCheck} size="sm" />
          </span>
          <h2 className={css({ textStyle: "heading.sm" })}>Text on accent.subtle</h2>
        </div>
        <p className={css({ textStyle: "body.md", color: "text.primary" })}>text.primary</p>
        <p className={css({ textStyle: "body.md", color: "text.secondary" })}>text.secondary</p>
        <p className={css({ textStyle: "body.md", color: "text.muted" })}>text.muted</p>
        <p className={css({ textStyle: "label.md", color: "accent" })}>accent</p>
      </section>

      <section className={plainCard()} data-testid="accent-sample-plain">
        <h2 className={css({ textStyle: "heading.sm" })}>Accent on a card</h2>
        <p className={css({ textStyle: "label.md", color: "accent" })}>accent as a label</p>
        <svg
          aria-label="Two chart lines: chart.primary solid, chart.accent dashed"
          className={css({ width: "100%", height: "auto", fill: "none" })}
          role="img"
          viewBox="0 0 300 80"
        >
          <path
            className={primaryLine}
            d="M6 50C50 46 80 34 120 30S190 16 230 12 280 8 294 6"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <path
            className={accentLine}
            d="M6 72C60 70 100 66 150 60S250 48 294 42"
            strokeDasharray="7 6"
            strokeLinecap="round"
            strokeWidth="3"
          />
        </svg>
      </section>

      <section className={heroSample()} data-testid="accent-sample-hero">
        <p className={css({ textStyle: "body.md" })}>
          One sun shape on surface.hero. The figure stays in text.onContrast.
        </p>
        <span aria-hidden="true" className={heroSun()} />
      </section>
    </div>
  </div>
);

export default AccentTokens;
