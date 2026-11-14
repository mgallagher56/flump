import type { FC } from "react";
import { cx } from "../../../styled-system/css";
import { CollapsibleDrawer } from "../../primitives/CollapsibleDrawer/CollapsibleDrawer";
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
  DELTA_TABLE_ROWS,
  type DeltaComponentKey,
  pensionPreviewSentence,
} from "./copy";
import {
  deltaPanelAssumptions,
  deltaPanelAssumptionsList,
  deltaPanelHeader,
  deltaPanelNumeric,
  deltaPanelRoot,
  deltaPanelSentence,
  deltaPanelTitle,
  deltaPanelUnverified,
  deltaPanelUnverifiedNote,
} from "./TakeHomeDeltaPanel.styles";

export type TakeHomeDeltaComponents = Record<DeltaComponentKey, number>;

export interface TakeHomeDeltaPanelProps {
  /** The pay rise being explained, usually 1,000. Sets the pence shown, with the other figures. */
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
  /**
   * With `showNotice={false}`: true when the page's one notice already leads with the
   * "Unverified estimate" sentence, so the panel does not repeat it as quiet text. Default false.
   */
  unverifiedInPageNotice?: boolean;
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
  unverifiedInPageNotice = false,
  className,
}) => {
  const Heading = headingLevel;
  const figures = [deltaGross, takeHome, ...Object.values(components)];
  const fractionDigits = figures.some(hasPence) ? 2 : 0;
  const money = (n: number) => formatMoney(n, { fractionDigits }).text;

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
        {/* Unverified, the full sentence is in the notice (or the page's notice), so no badge
            repeats it (P4.3). */}
        {isUnverifiedEstimate ? null : (
          <StatusBadge variant="info">{DELTA_PANEL_COPY.estimateBadge}</StatusBadge>
        )}
      </div>

      <TaxRatesStatusBanner
        calendarYear={calendarYear}
        isFallback={isFallback}
        ratesYear={ratesYear}
      />

      {/* No sentence restating the table, and no take-home row: the take-home figure is already
          the headline card (RESCORE Appendix B, pay rise item 1). The table lists the deductions. */}
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

      {/* One notice (E16 P4.1, P4.3): the unverified sentence leads the guidance note rather than
          sitting in a second, amber block; the header badge already flags the estimate. */}
      {showNotice ? (
        <ProjectionNotice
          lead={isUnverifiedEstimate ? DELTA_PANEL_COPY.unverifiedBanner : undefined}
        />
      ) : isUnverifiedEstimate && !unverifiedInPageNotice ? (
        // The page shows its one notice elsewhere, so the sentence stays as quiet text here.
        <p className={deltaPanelUnverifiedNote()}>{DELTA_PANEL_COPY.unverifiedBanner}</p>
      ) : null}

      {known.length > 0 ? (
        <CollapsibleDrawer title={DELTA_PANEL_COPY.assumptionsHeading} variant="quiet">
          <div className={deltaPanelAssumptions()}>
            <ul className={deltaPanelAssumptionsList()}>
              {known.map((a) => (
                <li key={a.code}>
                  {ASSUMPTION_COPY[a.code]}
                  {a.unverified ? (
                    <>
                      {" "}
                      <span className={deltaPanelUnverified()}>
                        {DELTA_PANEL_COPY.notConfirmed}
                      </span>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </CollapsibleDrawer>
      ) : null}
    </section>
  );
};

export default TakeHomeDeltaPanel;
