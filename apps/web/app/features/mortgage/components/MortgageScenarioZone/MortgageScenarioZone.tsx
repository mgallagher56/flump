import { Button, Icon, LiveRegion, ProjectionNotice, StatusBadge } from "@repo/ui";
import { CircleDashed } from "lucide-react";
import { type FC, type ReactNode, useId } from "react";
import { scenarioZone } from "./MortgageScenarioZone.styles";

export const SCENARIO_BADGE_TEXT = "Illustration, not saved";
export const SCENARIO_RESET_LABEL = "Reset to saved figures";
export const SCENARIO_ANNOUNCEMENT_PREFIX = "Illustration:";

export interface MortgageScenarioZoneProps {
  title?: string;
  /** "Starting from your figures: ...". Built from SAVED values only. */
  basis?: ReactNode;
  /** True once any scenario input differs from the saved figures. Shows the reset button. */
  isModified?: boolean;
  onReset?: () => void;
  /** Tool switcher rendered above the content. */
  tools?: ReactNode;
  children?: ReactNode;
  /** The "Update your details" link. It opens the normal edit form with the SAVED values. */
  footer?: ReactNode;
  /** Outcome text announced politely with the "Illustration:" prefix. Empty means silent. */
  announcement?: string;
  id?: string;
}

/**
 * Home for the mortgage what-if tools. Headline figures never read from here, and scenario inputs
 * never write to saved data: there is deliberately no "apply" action.
 */
export const MortgageScenarioZone: FC<MortgageScenarioZoneProps> = ({
  title = "Model a change to your mortgage",
  basis,
  isModified = false,
  onReset,
  tools,
  children,
  footer,
  announcement,
  id,
}) => {
  const headingId = useId();
  const slots = scenarioZone();
  return (
    <section aria-labelledby={headingId} className={slots.root} data-testid="scenario-zone" id={id}>
      <div className={slots.header}>
        <div className={slots.titleRow}>
          <h2 className={slots.title} id={headingId}>
            {title}
          </h2>
          <StatusBadge icon={<Icon icon={CircleDashed} size="sm" />} variant="neutral">
            {SCENARIO_BADGE_TEXT}
          </StatusBadge>
        </div>
        {basis ? <p className={slots.basis}>{basis}</p> : null}
      </div>
      <ProjectionNotice />
      {tools}
      <div className={slots.body}>{children}</div>
      {isModified ? (
        <Button className={slots.reset} size="sm" variant="secondary" onClick={onReset}>
          {SCENARIO_RESET_LABEL}
        </Button>
      ) : null}
      {footer ? <div className={slots.footer}>{footer}</div> : null}
      <LiveRegion
        announceInitial
        message={announcement ? `${SCENARIO_ANNOUNCEMENT_PREFIX} ${announcement}` : ""}
        visuallyHidden
      />
    </section>
  );
};

export default MortgageScenarioZone;
