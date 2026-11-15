import {
  buildFinancialPicture,
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

export interface BreathingRoomPreviewProps {
  id?: string;
  household?: SampleHouseholdKey;
  className?: string;
}

export const BreathingRoomPreview: FC<BreathingRoomPreviewProps> = ({
  id = "breathing-room-preview",
  household = "renter",
  className,
}) => {
  const fixture = SAMPLE_HOUSEHOLDS[household].fixture;
  const picture = buildFinancialPicture(fixture);

  const baselineSavings = picture.netWorth.liquidCash;
  const baselineEssentials =
    picture.monthsOfCover.status === "known"
      ? picture.monthsOfCover.value.monthlyEssentials
      : household === "homeowner"
        ? 1780
        : 1280;

  const baselineMonths =
    picture.monthsOfCover.status === "known"
      ? picture.monthsOfCover.value.months
      : Math.round((baselineSavings / baselineEssentials) * 10) / 10;

  const [spendingChange, setSpendingChange] = useState<number>(0);
  const [savingsChange, setSavingsChange] = useState<number>(0);

  const isModified = spendingChange !== 0 || savingsChange !== 0;

  const effectiveEssentials = Math.max(100, baselineEssentials + spendingChange);
  const effectiveSavings = Math.max(0, baselineSavings + savingsChange);
  const updatedMonths = Math.round((effectiveSavings / effectiveEssentials) * 10) / 10;
  const deltaMonths = Math.round((updatedMonths - baselineMonths) * 10) / 10;

  const handleReset = () => {
    setSpendingChange(0);
    setSavingsChange(0);
  };

  const gbp = (val: number) => formatMoney(val, { fractionDigits: 0 }).text;

  const announcement = isModified ? `Breathing room updated: about ${updatedMonths} months.` : "";

  return (
    <div className={`${breathingRoomRoot()} ${className ?? ""}`.trim()} data-testid={id} id={id}>
      <ScenarioZone
        announcement={announcement}
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
            Breathing room
          </p>
          <div aria-atomic="true" aria-live="polite">
            <p className={outcomeHeadline()} id={`${id}-headline`}>
              About {updatedMonths} months
            </p>
          </div>
          <p className={outcomeDescription()} id={`${id}-description`}>
            How long your savings would cover the essentials.
          </p>

          {isModified && (
            <span className={deltaBadge()} data-testid={`${id}-delta`}>
              {deltaMonths > 0 ? `+${deltaMonths}` : `${deltaMonths}`} months compared to saved
              figures
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
