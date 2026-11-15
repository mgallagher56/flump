import type { FC, ReactNode } from "react";
import { StatusBadge } from "../../primitives/StatusBadge/StatusBadge";
import {
  previewCaption,
  previewContent,
  previewFrame,
  previewHeader,
  previewSwitchButton,
  previewSwitcher,
  previewTitle,
  previewTitleGroup,
} from "./PreviewFrame.styles";

export const DEFAULT_PREVIEW_CAPTION = "Example household. These are sample figures.";

export type SampleHouseholdKey = "renter" | "homeowner";

export interface PreviewFrameProps {
  /** Identifier for HTML ids and data-testid hooks. */
  id: string;
  /** Heading displayed in the preview frame header. */
  title: string;
  /** Badge text, defaults to "Example". */
  badge?: string;
  /** Active sample household when a switcher is provided. */
  household?: SampleHouseholdKey;
  /** Callback when user changes household. Switcher is rendered when provided. */
  onHouseholdChange?: (household: SampleHouseholdKey) => void;
  /** Caption describing the sample nature of figures. Defaults to DEFAULT_PREVIEW_CAPTION. */
  caption?: ReactNode;
  /** Content rendered inside the frame. */
  children: ReactNode;
  className?: string;
}

/**
 * Accessible frame wrapping live illustrative previews across marketing and sandbox surfaces.
 * Marks figures clearly as example data, with optional household switcher and figcaption.
 */
export const PreviewFrame: FC<PreviewFrameProps> = ({
  id,
  title,
  badge = "Example",
  household = "renter",
  onHouseholdChange,
  caption = DEFAULT_PREVIEW_CAPTION,
  children,
  className,
}) => {
  const titleId = `${id}-title`;
  const badgeId = `${id}-badge`;
  const captionId = `${id}-caption`;

  return (
    <figure
      aria-labelledby={`${titleId} ${badgeId}`}
      className={`${previewFrame()} ${className ?? ""}`.trim()}
      data-testid={id}
      id={id}
    >
      <header className={previewHeader()}>
        <div className={previewTitleGroup()}>
          <h2 className={previewTitle()} id={titleId}>
            {title}
          </h2>
          <StatusBadge id={badgeId} size="sm" variant="neutral">
            {badge}
          </StatusBadge>
        </div>

        {onHouseholdChange && (
          <fieldset
            aria-label="Choose sample household"
            className={previewSwitcher()}
            data-testid={`${id}-switcher`}
          >
            <button
              aria-pressed={household === "renter"}
              className={previewSwitchButton({ active: household === "renter" })}
              data-testid={`${id}-switch-renter`}
              id={`${id}-switch-renter`}
              onClick={() => onHouseholdChange("renter")}
              type="button"
            >
              Renting
            </button>
            <button
              aria-pressed={household === "homeowner"}
              className={previewSwitchButton({ active: household === "homeowner" })}
              data-testid={`${id}-switch-homeowner`}
              id={`${id}-switch-homeowner`}
              onClick={() => onHouseholdChange("homeowner")}
              type="button"
            >
              Paying a mortgage
            </button>
          </fieldset>
        )}
      </header>

      <div className={previewContent()} data-testid={`${id}-content`}>
        {children}
      </div>

      <figcaption className={previewCaption()} data-testid={captionId} id={captionId}>
        {caption}
      </figcaption>
    </figure>
  );
};

export default PreviewFrame;
