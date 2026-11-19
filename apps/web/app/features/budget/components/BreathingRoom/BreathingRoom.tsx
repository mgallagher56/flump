import { type Figure, isFigureKnown, type MonthsOfCover } from "@flump/finance-engine";
import { InfoTip, Money, PageSection, ResultBlock } from "@repo/ui";
import { LifeBuoy } from "lucide-react";
import type { FC, ReactNode } from "react";
import { SampleAwareLink } from "~/components/navigation/SampleAwareLink";
import {
  BREATHING_ROOM_DESCRIPTION,
  BREATHING_ROOM_DETAIL,
  BREATHING_ROOM_LABEL,
  describeBreathingRoom,
} from "~/utils/breathingRoom";
import {
  breathingRoomFigure,
  breathingRoomResult,
  breathingRoomRow,
  breathingRoomSide,
  breathingRoomSource,
  breathingRoomSourceLink,
} from "./BreathingRoom.styles";

export interface BreathingRoomProps {
  /** The engine's months of cover from the page's financial picture. Never worked out here. */
  figure: Figure<MonthsOfCover>;
  /**
   * Beside the result card: what the figure counts, as a collapsible section (owner item 32b).
   * Built by the page, since it changes saved entries.
   */
  basis?: ReactNode;
}

/**
 * "Breathing room" (owner ruling 15 November 2026): the saved figure in a section of its own, in
 * one result card, outside the modelling zone (STYLE-GUIDE 12.5, UX-GUIDELINES S10). It shows the
 * figure, the owner's one-line description, and where the figure comes from in plain words, with
 * a link to the savings accounts it draws on (owner item 31). Facts only: no target, no colour
 * that says a number is good or bad. No scene of its own: the budget page's illustration is its
 * page icon in the header, and one illustration is in view (owner direction, 18 Nov 2026).
 */
export const BreathingRoom: FC<BreathingRoomProps> = ({ figure, basis }) => {
  const saved = isFigureKnown(figure) ? figure.value : null;
  const wording = saved ? describeBreathingRoom(saved.months) : null;
  return (
    <PageSection
      description={BREATHING_ROOM_DESCRIPTION}
      // The savings tile: the figure is about savings, and the accent stays off money figures (C8).
      domain="savings"
      icon={LifeBuoy}
      id="breathing-room"
      title={BREATHING_ROOM_LABEL}
      titleAddon={<InfoTip term={BREATHING_ROOM_LABEL}>{BREATHING_ROOM_DETAIL}</InfoTip>}
    >
      <div className={breathingRoomRow()}>
        <div className={breathingRoomSide()}>
          <ResultBlock
            className={breathingRoomResult()}
            emptyPrompt="Add your essential spending to see this."
            figure={
              saved && wording ? (
                <span className={breathingRoomFigure()} data-figure="monthsOfCover">
                  {wording.figure}
                </span>
              ) : null
            }
            hideLabel
            id="breathing-room-result"
            label={BREATHING_ROOM_LABEL}
            leadIn={wording?.leadIn}
          />
          {saved ? (
            <p
              className={breathingRoomSource()}
              data-testid="breathing-room-source"
              id="breathing-room-source"
            >
              From your savings of{" "}
              <span data-figure="monthsOfCover.liquidCash">
                <Money size="sm" value={saved.liquidCash} />
              </span>{" "}
              and essentials of{" "}
              <span data-figure="monthsOfCover.monthlyEssentials">
                <Money size="sm" value={saved.monthlyEssentials} />
              </span>{" "}
              a month.{" "}
              <SampleAwareLink
                className={breathingRoomSourceLink()}
                data-testid="breathing-room-savings-link"
                id="breathing-room-savings-link"
                sampleAriaLabel="Sign up to view your savings accounts"
                sampleLabel="View your savings accounts"
                to="/app/savings"
              >
                View your savings accounts
              </SampleAwareLink>
            </p>
          ) : null}
        </div>
        {basis}
      </div>
    </PageSection>
  );
};

export default BreathingRoom;
