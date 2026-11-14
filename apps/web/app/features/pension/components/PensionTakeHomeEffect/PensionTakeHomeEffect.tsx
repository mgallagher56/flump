import {
  getUkTaxYearContext,
  incomeScenarioFromFacts,
  type ProfileFacts,
  whatIfSacrificeChange,
} from "@flump/finance-engine";
import {
  asAtTaxYear,
  DELTA_PANEL_COPY,
  DELTA_TABLE_ROWS,
  formatMoney,
  pensionPreviewSentence,
  StatusBadge,
  Table,
  TaxRatesStatusBanner,
  TBody,
  Td,
  THead,
  Th,
  Tr,
} from "@repo/ui";
import { type FC, useMemo } from "react";
import { Link } from "react-router";
import {
  effectBadges,
  effectHeader,
  effectLink,
  effectNote,
  effectRoot,
  effectSentence,
  effectTitle,
  effectUnverified,
} from "./PensionTakeHomeEffect.styles";

export const PENSION_TAKE_HOME_COPY = {
  heading: "Effect on take-home",
  tableCaption: "Where the change in take-home comes from",
  partColumn: "Part",
  changeColumn: "Change a year",
  noExtra: "Set an extra amount each month to see the estimated effect on take-home.",
  missing: "Add your employment type, salary and pension details in",
  missingLink: "Profile",
  missingTail: "to see the estimated effect on take-home.",
  methodSalarySacrifice:
    "Assumes the extra is paid through your employer by salary sacrifice, like your current contribution.",
  methodNetPay:
    "Assumes the extra is paid through your employer from gross pay (net pay), like your current contribution.",
  methodAssumed: "Assumes the extra is paid through your employer by salary sacrifice.",
} as const;

export const monthlyTakeHomeSentence = (monthly: string): string =>
  `That is about ${monthly} a month less take-home.`;

export interface PensionTakeHomeEffectProps {
  /** Saved profile facts. Read only. */
  facts: ProfileFacts;
  /** The scenario's extra monthly contribution. Never saved. */
  extraMonthly: number;
}

const COMPONENT_ROWS = DELTA_TABLE_ROWS.filter((r) => r.key !== "pension");
const money = (n: number) => formatMoney(n, { fractionDigits: 0 }).text;

/**
 * What the pension scenario's extra monthly payment does to take-home, from the engine's
 * `whatIfSacrificeChange`. Illustration only: lives inside the pension ScenarioZone.
 */
export const PensionTakeHomeEffect: FC<PensionTakeHomeEffectProps> = ({ facts, extraMonthly }) => {
  const { scenario, missing } = useMemo(() => incomeScenarioFromFacts(facts), [facts]);
  const extraYear = Math.max(0, extraMonthly) * 12;
  const result = useMemo(
    () =>
      missing.length === 0 && extraYear > 0 ? whatIfSacrificeChange(scenario, extraYear) : null,
    [scenario, missing, extraYear],
  );
  const context = useMemo(() => getUkTaxYearContext(), []);

  if (missing.length > 0) {
    return (
      <p className={effectNote()} data-testid="pension-take-home-effect">
        {PENSION_TAKE_HOME_COPY.missing}{" "}
        <Link className={effectLink()} to="/app/profile">
          {PENSION_TAKE_HOME_COPY.missingLink}
        </Link>{" "}
        {PENSION_TAKE_HOME_COPY.missingTail}
      </p>
    );
  }
  if (!result) {
    return (
      <p className={effectNote()} data-testid="pension-take-home-effect">
        {PENSION_TAKE_HOME_COPY.noExtra}
      </p>
    );
  }

  const { before, after } = result;
  const unverified = before.isUnverifiedEstimate || after.isUnverifiedEstimate;
  const takeHomeFall = -result.deltaTakeHome;
  const rows = COMPONENT_ROWS.filter(({ key }) => result.components[key] !== 0);
  const methodNote =
    scenario.pension === undefined
      ? PENSION_TAKE_HOME_COPY.methodAssumed
      : after.pensionMethod === "net-pay"
        ? PENSION_TAKE_HOME_COPY.methodNetPay
        : PENSION_TAKE_HOME_COPY.methodSalarySacrifice;

  return (
    <div className={effectRoot()} data-testid="pension-take-home-effect">
      <div className={effectHeader()}>
        <h3 className={effectTitle()}>{PENSION_TAKE_HOME_COPY.heading}</h3>
        <div className={effectBadges()}>
          <StatusBadge variant="neutral">{asAtTaxYear(before.ratesYear)}</StatusBadge>
          <StatusBadge variant={unverified ? "warning" : "info"}>
            {unverified ? DELTA_PANEL_COPY.unverifiedBadge : DELTA_PANEL_COPY.estimateBadge}
          </StatusBadge>
        </div>
      </div>
      <TaxRatesStatusBanner
        calendarYear={context.calendarYear}
        isFallback={before.isFallback}
        ratesYear={before.ratesYear}
      />
      {unverified ? (
        <p className={effectUnverified()}>{DELTA_PANEL_COPY.unverifiedBanner}</p>
      ) : null}
      <p className={effectSentence()} data-figure="takeHome.delta">
        {pensionPreviewSentence(
          money(extraYear),
          money(takeHomeFall),
          money(result.deltaPensionGross),
        )}{" "}
        {monthlyTakeHomeSentence(money(takeHomeFall / 12))}
      </p>
      {rows.length > 0 ? (
        <Table caption={PENSION_TAKE_HOME_COPY.tableCaption}>
          <THead>
            <Tr>
              <Th scope="col">{PENSION_TAKE_HOME_COPY.partColumn}</Th>
              <Th numeric scope="col">
                {PENSION_TAKE_HOME_COPY.changeColumn}
              </Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map(({ key, label }) => (
              <Tr key={key}>
                <Th scope="row">{label}</Th>
                <Td label={PENSION_TAKE_HOME_COPY.changeColumn} numeric>
                  {money(result.components[key])}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      ) : null}
      <p className={effectNote()}>{methodNote}</p>
    </div>
  );
};

export default PensionTakeHomeEffect;
