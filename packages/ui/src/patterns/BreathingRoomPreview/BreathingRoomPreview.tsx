import {
  buildFinancialPicture,
  monthsOfCoverFor,
  SAMPLE_HOUSEHOLDS,
  type SampleHouseholdKey,
} from "@flump/finance-engine";
import { type FC, useState } from "react";
import { formatMoney } from "../../primitives/Money/Money";
import { SliderField } from "../../primitives/SliderField/SliderField";
import { ProjectionNotice } from "../ProjectionNotice/ProjectionNotice";
import { ScenarioZone } from "../ScenarioZone/ScenarioZone";
import {
  breakdownList,
  breakdownRow,
  breakdownTerm,
  breakdownValue,
  breathingRoomRoot,
  deltaBadge,
  outcomeCard,
  outcomeDescription,
  outcomeHeadline,
  outcomeLabel,
  scenarioControls,
} from "./BreathingRoomPreview.styles";
import {
  BREATHING_ROOM_DESCRIPTION,
  BREATHING_ROOM_LABEL,
  breathingRoomPhrase,
  breathingRoomValue,
} from "./BreathingRoomPreview.wording";

export interface BreathingRoomPreviewProps {
  id?: string;
  household?: SampleHouseholdKey;
  className?: string;
}

/** The smallest monthly essentials the sliders can reach, so the ratio always has a divisor. */
const MIN_ESSENTIALS = 100;

const deltaFormat = new Intl.NumberFormat("en-GB", {
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

/**
 * Breathing room for a sample household, with a what-if zone on top of it. Every figure comes
 * from the engine's picture of the fixture; when the picture does not know the figure, nothing
 * renders (no invented fallback).
 */
export const BreathingRoomPreview: FC<BreathingRoomPreviewProps> = ({
  id = "breathing-room-preview",
  household = "renter",
  className,
}) => {
  const [spendingChange, setSpendingChange] = useState<number>(0);
  const [savingsChange, setSavingsChange] = useState<number>(0);

  const picture = buildFinancialPicture(SAMPLE_HOUSEHOLDS[household].fixture);
  if (picture.monthsOfCover.status !== "known") return null;

  const {
    liquidCash: baselineSavings,
    monthlyEssentials: baselineEssentials,
    months: baselineMonths,
  } = picture.monthsOfCover.value;

  const isModified = spendingChange !== 0 || savingsChange !== 0;

  const effectiveEssentials = Math.max(MIN_ESSENTIALS, baselineEssentials + spendingChange);
  const effectiveSavings = Math.max(0, baselineSavings + savingsChange);
  const updatedMonths = monthsOfCoverFor(effectiveSavings, effectiveEssentials) ?? baselineMonths;
  const deltaMonths = Math.round((updatedMonths - baselineMonths) * 10) / 10;
  const deltaText =
    deltaMonths === 0
      ? "No change compared to saved figures"
      : `${deltaFormat.format(deltaMonths)} ${Math.abs(deltaMonths) === 1 ? "month" : "months"} compared to saved figures`;

  const handleReset = () => {
    setSpendingChange(0);
    setSavingsChange(0);
  };

  const gbp = (val: number) => formatMoney(val, { fractionDigits: 0 }).text;

  const announcement = isModified
    ? `${BREATHING_ROOM_LABEL} updated: ${breathingRoomPhrase(updatedMonths)}.`
    : "";

  return (
    <div className={`${breathingRoomRoot()} ${className ?? ""}`.trim()} data-testid={id} id={id}>
      <ScenarioZone
        announcement={announcement}
        headingAs="h3"
        basis={`Starting from saved figures: ${gbp(baselineSavings)} in savings, ${gbp(baselineEssentials)} a month in essentials`}
        id={`${id}-zone`}
        isModified={isModified}
        notice={
          <ProjectionNotice
            lead={
              <>Unverified estimate. These figures model a change against example household data.</>
            }
          />
        }
        onReset={handleReset}
        title="Model a change"
      >
        <div className={scenarioControls()}>
          <SliderField
            format="currency"
            label="Change in monthly essential spending"
            max={500}
            min={-500}
            step={25}
            value={spendingChange}
            onChange={setSpendingChange}
          />

          <SliderField
            format="currency"
            label="Change in emergency savings"
            max={5000}
            min={-3000}
            step={250}
            value={savingsChange}
            onChange={setSavingsChange}
          />
        </div>

        <div className={outcomeCard()} data-testid={`${id}-outcome`}>
          <p className={outcomeLabel()} id={`${id}-label`}>
            {BREATHING_ROOM_LABEL}
          </p>
          {/* The zone announces the change, so the figure itself is not a second live region. */}
          <p className={outcomeHeadline()} id={`${id}-headline`}>
            {breathingRoomValue(updatedMonths)}
          </p>
          <p className={outcomeDescription()} id={`${id}-description`}>
            {BREATHING_ROOM_DESCRIPTION}
          </p>

          {isModified && (
            <span className={deltaBadge()} data-testid={`${id}-delta`}>
              {deltaText}
            </span>
          )}

          <dl className={breakdownList()}>
            <div className={breakdownRow()}>
              <dt className={breakdownTerm()}>Essential spending</dt>
              <dd className={breakdownValue()} data-testid={`${id}-essentials`}>
                {gbp(effectiveEssentials)} a month
              </dd>
            </div>
            <div className={breakdownRow()}>
              <dt className={breakdownTerm()}>Emergency savings</dt>
              <dd className={breakdownValue()} data-testid={`${id}-savings`}>
                {gbp(effectiveSavings)}
              </dd>
            </div>
          </dl>
        </div>
      </ScenarioZone>
    </div>
  );
};

export default BreathingRoomPreview;
