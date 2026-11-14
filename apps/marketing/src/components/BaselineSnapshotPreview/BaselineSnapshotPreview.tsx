import { HeroFigure, KpiCard, StatusBadge } from "@repo/ui";
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
 * Example figures for the hero preview. They tell one story: the same household appears in the
 * FAQ wording, and no figure here is repeated with a different value elsewhere on the page.
 */
export const PREVIEW_EXAMPLE = {
  netWorthGbp: 68_400,
  leftOverMonthlyGbp: 672,
  monthsOfCover: 6.4,
} as const;

const months = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

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
        <KpiCard
          key="left-over"
          label="Left over each month"
          value={PREVIEW_EXAMPLE.leftOverMonthlyGbp}
          valueFormat={{ fractionDigits: 0 }}
        />
        <KpiCard
          key="cover"
          label="Months of cover"
          value={
            <span className={previewFigure()}>
              {months.format(PREVIEW_EXAMPLE.monthsOfCover)} months
            </span>
          }
        />
      </div>
    </div>
    <figcaption className={previewCaption()}>
      Example figures for one household. Yours come from the numbers you enter.
    </figcaption>
  </figure>
);

export default BaselineSnapshotPreview;
