import { buildFinancialPicture, SAMPLE_HOUSEHOLDS } from "@flump/finance-engine";
import {
  BREATHING_ROOM_DESCRIPTION,
  BREATHING_ROOM_LABEL,
  breathingRoomValue,
  HeroFigure,
  KpiCard,
  StatusBadge,
} from "@repo/ui";
import type { FC } from "react";
import {
  previewBody,
  previewCaption,
  previewFigure,
  previewFrame,
  previewHeader,
  previewHero,
  previewSupporting,
  previewTitle,
} from "./BaselineSnapshotPreview.styles";

/**
 * The sample household the home preview shows: the same `SAMPLE_HOUSEHOLDS` fixture the
 * interactive preview opens on, run through the engine, so marketing shows one set of figures.
 */
export const HOME_PREVIEW_HOUSEHOLD = "renter" as const;

const picture = buildFinancialPicture(SAMPLE_HOUSEHOLDS[HOME_PREVIEW_HOUSEHOLD].fixture);

/** The preview's figures. A figure the engine does not know is `null`, and its card is left out. */
export const PREVIEW_EXAMPLE = {
  netWorthGbp: picture.netWorth.netWorth,
  leftOverMonthlyGbp: picture.budget.status === "known" ? picture.budget.value.surplus : null,
  monthsOfCover:
    picture.monthsOfCover.status === "known" ? picture.monthsOfCover.value.months : null,
} as const;

/**
 * The home hero's product preview (E16 PR 12): the dashboard's own `HeroFigure` for the one
 * emphasised figure and two `KpiCard`s beside it, all labelled "Example". No status colours on the
 * figures (P9), no chart. It is the page's only hero block.
 */
export const BaselineSnapshotPreview: FC = () => (
  <figure
    aria-labelledby="preview-title preview-badge"
    className={previewFrame()}
    data-testid="baseline-snapshot-preview"
  >
    <div className={previewHeader()}>
      <h2 className={previewTitle()} id="preview-title">
        Monthly picture
      </h2>
      <StatusBadge id="preview-badge" size="sm" variant="neutral">
        Example
      </StatusBadge>
    </div>
    <div className={previewBody()}>
      <HeroFigure
        className={previewHero()}
        id="preview-net-worth"
        label="Net worth"
        value={PREVIEW_EXAMPLE.netWorthGbp}
        valueFormat={{ fractionDigits: 0 }}
      />
      <div className={previewSupporting()}>
        {PREVIEW_EXAMPLE.leftOverMonthlyGbp !== null && (
          <KpiCard
            key="left-over"
            label="Left over each month"
            value={PREVIEW_EXAMPLE.leftOverMonthlyGbp}
            valueFormat={{ fractionDigits: 0 }}
          />
        )}
        {PREVIEW_EXAMPLE.monthsOfCover !== null && (
          <KpiCard
            key="cover"
            label={BREATHING_ROOM_LABEL}
            subtext={BREATHING_ROOM_DESCRIPTION}
            value={
              <span className={previewFigure()}>
                {breathingRoomValue(PREVIEW_EXAMPLE.monthsOfCover)}
              </span>
            }
          />
        )}
      </div>
    </div>
    <figcaption className={previewCaption()}>
      Example household. These are sample figures.
    </figcaption>
  </figure>
);

export default BaselineSnapshotPreview;
