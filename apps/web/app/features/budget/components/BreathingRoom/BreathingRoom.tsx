import { type Figure, isFigureKnown, type MonthsOfCover } from "@flump/finance-engine";
import { Illustration, InfoTip, Money, PageSection, ResultBlock } from "@repo/ui";
import { LifeBuoy } from "lucide-react";
import type { FC } from "react";
import {
  BREATHING_ROOM_DESCRIPTION,
  BREATHING_ROOM_DETAIL,
  BREATHING_ROOM_LABEL,
  describeBreathingRoom,
  MONEY_TO_DRAW_ON_LABEL,
} from "~/utils/breathingRoom";
import {
  breathingRoomFigure,
  breathingRoomResult,
  breathingRoomRow,
  breathingRoomScene,
} from "./BreathingRoom.styles";

export interface BreathingRoomProps {
  /** The engine's months of cover from the page's financial picture. Never worked out here. */
  figure: Figure<MonthsOfCover>;
}

/**
 * "Breathing room" (owner ruling 15 November 2026): the saved figure in a section of its own, in
 * one result card, outside the modelling zone (STYLE-GUIDE 12.5, UX-GUIDELINES S10). It shows the
 * figure, the owner's one-line description and the money to draw on. Facts only: no target, no
 * colour that says a number is good or bad. From lg the card leaves half the row empty, so one still
 * scene sits beside it there (B10); it is not an empty state, so it does not settle.
 */
export const BreathingRoom: FC<BreathingRoomProps> = ({ figure }) => {
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
          row={
            saved
              ? {
                  label: MONEY_TO_DRAW_ON_LABEL,
                  value: (
                    <span data-figure="monthsOfCover.liquidCash">
                      <Money size="sm" value={saved.liquidCash} />
                    </span>
                  ),
                }
              : undefined
          }
        />
        {saved ? (
          <div
            aria-hidden="true"
            className={breathingRoomScene()}
            data-testid="breathing-room-scene"
            id="breathing-room-scene"
          >
            <Illustration scene="empty-savings" settle={false} size="md" />
          </div>
        ) : null}
      </div>
    </PageSection>
  );
};

export default BreathingRoom;
