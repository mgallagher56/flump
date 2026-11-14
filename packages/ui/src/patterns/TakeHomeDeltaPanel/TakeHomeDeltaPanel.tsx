import type { FC } from "react";
import { cx } from "../../../styled-system/css";
import { formatMoney } from "../../primitives/Money/Money";
import { StatusBadge } from "../../primitives/StatusBadge/StatusBadge";
import { Table, TBody, Td, THead, Th, Tr } from "../../primitives/Table/Table";
import { ProjectionNotice } from "../ProjectionNotice/ProjectionNotice";
import { TaxRatesStatusBanner } from "../TaxRatesStatusBanner/TaxRatesStatusBanner";
import {
  ASSUMPTION_COPY,
  type AssumptionCode,
  asAtTaxYear,
  DELTA_PANEL_COPY,
  DELTA_SENTENCE_PARTS,
  DELTA_TABLE_ROWS,
  type DeltaComponentKey,
  deltaSentence,
  pensionPreviewSentence,
} from "./copy";
import {
  deltaPanelAssumptions,
  deltaPanelAssumptionsList,
  deltaPanelAssumptionsTitle,
  deltaPanelBanner,
  deltaPanelHeader,
  deltaPanelNumeric,
  deltaPanelRoot,
  deltaPanelSentence,
  deltaPanelTitle,
  deltaPanelUnverified,
} from "./TakeHomeDeltaPanel.styles";

export type TakeHomeDeltaComponents = Record<DeltaComponentKey, number>;

export interface TakeHomeDeltaPanelProps {
  /** The pay rise being explained, usually 1,000. */
  deltaGross: number;
  /** Change in take-home from that rise. */
  takeHome: number;
  components: TakeHomeDeltaComponents;
  /** Tax year whose rates were used. */
  ratesYear: string;
  isFallback: boolean;
  /** Tax year the calendar is in, for the fallback banner. */
  calendarYear: string;
  isUnverifiedEstimate: boolean;
  assumptions: readonly { code: string; unverified: boolean }[];
  /** "An extra £X a year into your pension…" line. */
  pensionPreview?: { contribution: number; takeHomeChange: number; reachesPension: number };
  headingLevel?: "h2" | "h3" | "h4";
  /**
   * Shows the "Guidance, not advice" notice. Default true. Pass false inside a ScenarioZone or a page
   * that already shows it, so the notice (a labelled landmark) appears once.
   */
  showNotice?: boolean;
  className?: string;
}

const hasPence = (n: number) => Math.abs(Math.round(n * 100) % 100) > 0;

/** Explains where the next slice of pay goes. Pure presentational: callers pass engine output. */
export const TakeHomeDeltaPanel: FC<TakeHomeDeltaPanelProps> = ({
  deltaGross,
  takeHome,
  components,
  ratesYear,
  isFallback,
  calendarYear,
  isUnverifiedEstimate,
  assumptions,
  pensionPreview,
  headingLevel = "h3",
  showNotice = true,
  className,
}) => {
  const Heading = headingLevel;
  const figures = [deltaGross, takeHome, ...Object.values(components)];
  const fractionDigits = figures.some(hasPence) ? 2 : 0;
  const money = (n: number) => formatMoney(n, { fractionDigits }).text;

  const parts = DELTA_SENTENCE_PARTS.filter(({ key }) => components[key] > 0).map(
    ({ key, label }) => `${money(components[key])} ${label}`,
  );
  const rows = DELTA_TABLE_ROWS.filter(({ key }) => components[key] > 0);
  const known = assumptions.filter((a): a is { code: AssumptionCode; unverified: boolean } =>
    Object.hasOwn(ASSUMPTION_COPY, a.code),
  );

  let previewText: string | null = null;
  if (pensionPreview) {
    const pd =
      hasPence(pensionPreview.contribution) ||
      hasPence(pensionPreview.takeHomeChange) ||
      hasPence(pensionPreview.reachesPension)
        ? 2
        : 0;
    const pm = (n: number) => formatMoney(n, { fractionDigits: pd }).text;
    previewText = pensionPreviewSentence(
      pm(pensionPreview.contribution),
      pm(pensionPreview.takeHomeChange),
      pm(pensionPreview.reachesPension),
    );
  }

  return (
    <section
      aria-label={DELTA_PANEL_COPY.heading}
      className={cx(deltaPanelRoot(), className)}
      data-testid="take-home-delta-panel"
    >
      <div className={deltaPanelHeader()}>
        <Heading className={deltaPanelTitle()}>{DELTA_PANEL_COPY.heading}</Heading>
        <StatusBadge variant="neutral">{asAtTaxYear(ratesYear)}</StatusBadge>
        <StatusBadge variant={isUnverifiedEstimate ? "warning" : "info"}>
          {isUnverifiedEstimate ? DELTA_PANEL_COPY.unverifiedBadge : DELTA_PANEL_COPY.estimateBadge}
        </StatusBadge>
      </div>

      <TaxRatesStatusBanner
        calendarYear={calendarYear}
        isFallback={isFallback}
        ratesYear={ratesYear}
      />

      <p className={deltaPanelSentence()} data-testid="take-home-delta-sentence">
        {deltaSentence(money(deltaGross), money(takeHome), parts)}
      </p>

      <Table caption={DELTA_PANEL_COPY.tableCaption}>
        <THead>
          <Tr>
            <Th scope="col">{DELTA_PANEL_COPY.partColumn}</Th>
            <Th numeric scope="col">
              {DELTA_PANEL_COPY.amountColumn}
            </Th>
          </Tr>
        </THead>
        <TBody>
          <Tr>
            <Th scope="row">{DELTA_PANEL_COPY.takeHomeRow}</Th>
            <Td className={deltaPanelNumeric()} label={DELTA_PANEL_COPY.amountColumn} numeric>
              {money(takeHome)}
            </Td>
          </Tr>
          {rows.map(({ key, label }) => (
            <Tr key={key}>
              <Th scope="row">{label}</Th>
              <Td className={deltaPanelNumeric()} label={DELTA_PANEL_COPY.amountColumn} numeric>
                {money(components[key])}
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>

      {previewText ? (
        <p className={deltaPanelSentence()} data-testid="take-home-delta-pension">
          {previewText}
        </p>
      ) : null}

      {isUnverifiedEstimate ? (
        <p className={deltaPanelBanner()}>{DELTA_PANEL_COPY.unverifiedBanner}</p>
      ) : null}

      {showNotice ? <ProjectionNotice /> : null}

      {known.length > 0 ? (
        <div className={deltaPanelAssumptions()}>
          <p className={deltaPanelAssumptionsTitle()}>{DELTA_PANEL_COPY.assumptionsHeading}</p>
          <ul className={deltaPanelAssumptionsList()}>
            {known.map((a) => (
              <li key={a.code}>
                {ASSUMPTION_COPY[a.code]}
                {a.unverified ? (
                  <>
                    {" "}
                    <span className={deltaPanelUnverified()}>{DELTA_PANEL_COPY.notConfirmed}</span>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
};

export default TakeHomeDeltaPanel;
