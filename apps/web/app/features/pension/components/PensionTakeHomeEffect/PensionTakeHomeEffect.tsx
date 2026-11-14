import {
  getUkTaxYearContext,
  incomeScenarioFromFacts,
  type ProfileFacts,
  type UkWhatIfResult,
  whatIfSacrificeChange,
} from "@flump/finance-engine";
import {
  asAtTaxYear,
  CollapsibleDrawer,
  DELTA_TABLE_ROWS,
  formatMoney,
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
  effectLink,
  effectNote,
  effectRoot,
  outcomeLabel,
  outcomeSuffix,
  outcomeSupport,
  outcomeSupportItem,
  outcomeValue,
} from "./PensionTakeHomeEffect.styles";

export const PENSION_TAKE_HOME_COPY = {
  outcomeLabel: "Change in take-home pay",
  perMonth: "a month",
  reachesPension: "Extra into your pension",
  reliefLabel: "Covered by tax and National Insurance relief",
  tableTitle: "Where the change in take-home pay comes from",
  partColumn: "Part",
  changeColumn: "Change a year",
  noChange:
    "Move your contribution away from your saved figure to see the estimated effect on take-home pay.",
  missing: "Add your employment type, salary and pension details in",
  missingLink: "Profile",
  missingTail: "to see the estimated effect on take-home pay.",
  methodSalarySacrifice: "Assumes the change is paid by salary sacrifice, like your contribution.",
  methodNetPay:
    "Assumes the change is taken from your pay before Income Tax, like your contribution.",
  methodAssumed: "Assumes the change is paid by salary sacrifice.",
} as const;

export interface PensionTakeHomeEffectData {
  /** Saved facts still missing before the engine can work out take-home pay. */
  missing: readonly string[];
  /** `null` when facts are missing or the change is zero. */
  result: UkWhatIfResult | null;
  /** True when the saved facts carry no pension method, so salary sacrifice is assumed. */
  methodAssumed: boolean;
}

/**
 * The engine's take-home effect of changing the yearly pension contribution by `deltaYear`
 * pounds. Pure: the zone also reads it to decide whether the notice needs the unverified lead.
 */
export const computePensionTakeHomeEffect = (
  facts: ProfileFacts,
  deltaYear: number,
): PensionTakeHomeEffectData => {
  const { scenario, missing } = incomeScenarioFromFacts(facts);
  const rounded = Math.round(deltaYear);
  return {
    missing,
    result: missing.length === 0 && rounded !== 0 ? whatIfSacrificeChange(scenario, rounded) : null,
    methodAssumed: scenario.pension === undefined,
  };
};

export const isTakeHomeEffectUnverified = (effect: PensionTakeHomeEffectData): boolean =>
  Boolean(effect.result?.before.isUnverifiedEstimate || effect.result?.after.isUnverifiedEstimate);

export interface PensionTakeHomeEffectProps {
  effect: PensionTakeHomeEffectData;
}

const COMPONENT_ROWS = DELTA_TABLE_ROWS.filter((r) => r.key !== "pension");
const money = (n: number) => formatMoney(n, { fractionDigits: 0 }).text;
const signed = (n: number) => formatMoney(n, { fractionDigits: 0, signDisplay: "always" }).text;

/**
 * The "Effect on take-home pay" tool's outcome: one figure (the monthly change) and two
 * supporting figures. Illustration only, inside the pension ScenarioZone. The standard
 * "Unverified estimate" sentence goes in the zone's one notice, not here.
 */
export const PensionTakeHomeEffect: FC<PensionTakeHomeEffectProps> = ({ effect }) => {
  const context = useMemo(() => getUkTaxYearContext(), []);
  const { missing, result } = effect;

  if (missing.length > 0) {
    return (
      <p
        className={effectNote()}
        data-testid="pension-take-home-effect"
        id="pension-take-home-effect"
      >
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
      <p
        className={effectNote()}
        data-testid="pension-take-home-effect"
        id="pension-take-home-effect"
      >
        {PENSION_TAKE_HOME_COPY.noChange}
      </p>
    );
  }

  const { before, after } = result;
  const takeHomeMonthly = result.deltaTakeHome / 12;
  const pensionMonthly = result.deltaPensionGross / 12;
  const reliefMonthly = Math.abs(pensionMonthly) - Math.abs(takeHomeMonthly);
  const rows = COMPONENT_ROWS.filter(({ key }) => result.components[key] !== 0);
  const methodNote = effect.methodAssumed
    ? PENSION_TAKE_HOME_COPY.methodAssumed
    : after.pensionMethod === "net-pay"
      ? PENSION_TAKE_HOME_COPY.methodNetPay
      : PENSION_TAKE_HOME_COPY.methodSalarySacrifice;

  return (
    <div
      className={effectRoot()}
      data-testid="pension-take-home-effect"
      id="pension-take-home-effect"
    >
      <TaxRatesStatusBanner
        calendarYear={context.calendarYear}
        isFallback={before.isFallback}
        ratesYear={before.ratesYear}
      />
      <div>
        <p className={outcomeLabel()}>
          {PENSION_TAKE_HOME_COPY.outcomeLabel}{" "}
          <StatusBadge size="sm" variant="neutral">
            {asAtTaxYear(before.ratesYear)}
          </StatusBadge>
        </p>
        <p className={outcomeValue()} data-figure="takeHome.delta">
          {signed(takeHomeMonthly)}{" "}
          <span className={outcomeSuffix()}>{PENSION_TAKE_HOME_COPY.perMonth}</span>
        </p>
        <dl className={outcomeSupport()}>
          <div className={outcomeSupportItem()}>
            <dt>{PENSION_TAKE_HOME_COPY.reachesPension}</dt>
            <dd>
              {signed(pensionMonthly)} {PENSION_TAKE_HOME_COPY.perMonth}
            </dd>
          </div>
          <div className={outcomeSupportItem()}>
            <dt>{PENSION_TAKE_HOME_COPY.reliefLabel}</dt>
            <dd>
              {money(Math.max(0, reliefMonthly))} {PENSION_TAKE_HOME_COPY.perMonth}
            </dd>
          </div>
        </dl>
      </div>
      <p className={effectNote()}>{methodNote}</p>
      {rows.length > 0 ? (
        <CollapsibleDrawer title="Show details" variant="quiet">
          <Table caption={PENSION_TAKE_HOME_COPY.tableTitle}>
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
        </CollapsibleDrawer>
      ) : null}
    </div>
  );
};

export default PensionTakeHomeEffect;
