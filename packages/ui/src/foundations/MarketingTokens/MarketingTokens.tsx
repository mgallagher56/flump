import type { FC } from "react";
import { css } from "../../../styled-system/css";
import { marketingDurations, marketingEasings } from "../../tokens";
import {
  glassCard,
  marketingPage,
  materialFills,
  orbFills,
  paperCard,
  sampleGrid,
  scaleCell,
  scaleFigure,
  scaleTable,
  swatchChip,
  swatchRow,
} from "./MarketingTokens.styles";

const ORB_NOTES: Record<string, string> = {
  core: "The orb's first tone",
  shade: "The orb's second tone; the beads alternate the two",
  bubble: "A bubble's lit fill",
  bubbleShade: "A bubble's far fill",
  rim: "A bubble's soft edge",
};

const MATERIAL_NOTES: Record<keyof typeof materialFills, string> = {
  "material.glass.fill": "Glass card fill",
  "material.glass.border": "Glass card border",
  "material.glass.light": "The inner top light",
  "material.glass.sheen": "The faint diagonal sheen",
  "material.paper.fill": "Paper document fill",
  "material.paper.edge": "Paper document edge",
  "material.paper.rule": "Faint ruled lines",
};

const Swatches: FC<{ fills: Record<string, string>; note: (token: string) => string }> = ({
  fills,
  note,
}) => (
  <ul className={css({ display: "grid", gap: "8px" })}>
    {Object.entries(fills).map(([token, fill]) => (
      <li
        className={swatchRow()}
        data-testid={`marketing-token-${token}`}
        id={`marketing-token-${token}`}
        key={token}
      >
        <span aria-hidden="true" className={`${swatchChip()} ${fill}`} />
        <code className={css({ fontFamily: "mono", fontSize: "xs" })}>{token}</code>
        <span className={css({ color: "text.muted" })}>{note(token)}</span>
      </li>
    ))}
  </ul>
);

/**
 * The marketing site's tokens (slice F2, owner, 27 Nov 2026; STYLE-GUIDE 2.7 and 11): the two orb
 * colour sets, the glass and paper card materials and the calm motion scale, in one place so they
 * can be checked in light and dark. Violet and rose are for the orb and bubble fields only (MC1).
 */
export const MarketingTokens: FC = () => (
  <div className={marketingPage()}>
    <div>
      <h1 className={css({ textStyle: "heading.lg" })}>Marketing orb, material and motion</h1>
      <p className={css({ textStyle: "body.sm", color: "text.muted", mt: "4px" })}>
        For the marketing site. The orb colours belong to the orb, its beads and the bubble fields,
        never to a card, band or picture. The materials are neutral.
      </p>
    </div>

    <section className={css({ display: "grid", gap: "12px" })}>
      <h2 className={css({ textStyle: "heading.sm" })}>Orb colour sets</h2>
      <Swatches fills={orbFills} note={(token) => ORB_NOTES[token.split(".")[2] ?? ""] ?? ""} />
    </section>

    <section className={css({ display: "grid", gap: "12px" })}>
      <h2 className={css({ textStyle: "heading.sm" })}>Card materials</h2>
      <Swatches
        fills={materialFills}
        note={(token) => MATERIAL_NOTES[token as keyof typeof materialFills]}
      />
      <div className={sampleGrid()}>
        <section
          className={glassCard()}
          data-testid="marketing-sample-glass"
          id="marketing-sample-glass"
        >
          <h3 className={css({ textStyle: "heading.sm" })}>Text on glass</h3>
          <p className={css({ textStyle: "body.md", color: "text.primary" })}>text.primary</p>
          <p className={css({ textStyle: "body.md", color: "text.secondary" })}>text.secondary</p>
          <p className={css({ textStyle: "body.md", color: "text.muted" })}>text.muted</p>
        </section>
        <section
          className={paperCard()}
          data-testid="marketing-sample-paper"
          id="marketing-sample-paper"
        >
          <h3 className={css({ textStyle: "heading.sm" })}>Text on paper</h3>
          <p className={css({ textStyle: "body.md", color: "text.primary" })}>text.primary</p>
          <p className={css({ textStyle: "body.md", color: "text.secondary" })}>text.secondary</p>
          <p className={css({ textStyle: "body.md", color: "text.muted" })}>text.muted</p>
        </section>
      </div>
    </section>

    <section className={css({ display: "grid", gap: "12px" })}>
      <h2 className={css({ textStyle: "heading.sm" })}>Calm motion scale</h2>
      <p className={css({ textStyle: "body.sm", color: "text.muted" })}>
        Marketing only, as durations.marketing and easings.marketing. The apps keep fast, base and
        slow.
      </p>
      <table
        className={scaleTable}
        data-testid="marketing-motion-scale"
        id="marketing-motion-scale"
      >
        <thead>
          <tr>
            <th className={scaleCell} scope="col">
              Token
            </th>
            <th className={scaleCell} scope="col">
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(marketingDurations).map(([key, token]) => (
            <tr key={key}>
              <td className={scaleCell}>
                <code>durations.marketing.{key}</code>
              </td>
              <td className={scaleFigure}>{token.value}</td>
            </tr>
          ))}
          {Object.entries(marketingEasings).map(([key, token]) => (
            <tr key={key}>
              <td className={scaleCell}>
                <code>easings.marketing.{key}</code>
              </td>
              <td className={scaleFigure}>{token.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  </div>
);

export default MarketingTokens;
