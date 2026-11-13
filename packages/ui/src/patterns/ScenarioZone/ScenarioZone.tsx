import { CircleDashed } from "lucide-react";
import { type FC, type ReactNode, useId } from "react";
import { cx } from "../../../styled-system/css";
import { Button } from "../../primitives/Button/Button";
import { Heading } from "../../primitives/Heading/Heading";
import { Icon } from "../../primitives/Icon";
import { LiveRegion } from "../../primitives/LiveRegion/LiveRegion";
import { StatusBadge } from "../../primitives/StatusBadge/StatusBadge";
import { ProjectionNotice } from "../ProjectionNotice/ProjectionNotice";
import { scenarioZone } from "./ScenarioZone.styles";

export const SCENARIO_BADGE_TEXT = "Illustration, not saved";
export const SCENARIO_RESET_LABEL = "Reset to saved figures";
export const SCENARIO_ANNOUNCEMENT_PREFIX = "Illustration:";

export interface ScenarioZoneProps {
  /** The zone heading. Defaults to "Model a change". */
  title?: string;
  /** "Starting from your figures: £X at Y%, Z years left". Built from SAVED values only. */
  basis?: ReactNode;
  /** True once any scenario input differs from the saved figures. Shows the reset button. */
  isModified?: boolean;
  /** Called by "Reset to saved figures". Restores scenario inputs to the saved values. */
  onReset?: () => void;
  /** Optional tool switcher (for example SegmentedTabs) rendered above the content. */
  tools?: ReactNode;
  /** The what-if tool(s). */
  children?: ReactNode;
  /** The "Update your details" link. It opens the normal edit form with the SAVED values. */
  footer?: ReactNode;
  /**
   * Outcome text announced politely, prefixed with "Illustration:". Keep it empty until the user
   * changes an input, and derive it only while `isModified`. A non-empty value present at mount
   * is spoken once.
   */
  announcement?: string;
  /** Id for the section element. */
  id?: string;
  className?: string;
}

/**
 * The single home for what-if tools on a page. Headline figures and KpiStrips never read from
 * here, and scenario inputs never write to saved data: there is deliberately no "apply" action.
 */
export const ScenarioZone: FC<ScenarioZoneProps> = ({
  title = "Model a change",
  basis,
  isModified = false,
  onReset,
  tools,
  children,
  footer,
  announcement,
  id,
  className,
}) => {
  const headingId = useId();
  const slots = scenarioZone();
  return (
    <section
      aria-labelledby={headingId}
      id={id}
      className={cx(slots.root, className)}
      data-testid="scenario-zone"
    >
      <div className={slots.header}>
        <div className={slots.titleRow}>
          <Heading as="h2" data-testid="scenario-zone-title" id={headingId} size="md">
            {title}
          </Heading>
          <StatusBadge variant="neutral" icon={<Icon icon={CircleDashed} size="sm" />}>
            {SCENARIO_BADGE_TEXT}
          </StatusBadge>
        </div>
        {basis ? <p className={slots.basis}>{basis}</p> : null}
      </div>
      <ProjectionNotice />
      {tools}
      <div className={slots.body}>{children}</div>
      {isModified ? (
        <Button className={slots.reset} variant="secondary" size="sm" onClick={onReset}>
          {SCENARIO_RESET_LABEL}
        </Button>
      ) : null}
      {footer ? <div className={slots.footer}>{footer}</div> : null}
      <LiveRegion
        message={announcement ? `${SCENARIO_ANNOUNCEMENT_PREFIX} ${announcement}` : ""}
        visuallyHidden
        // The announcement is only ever set by a user action, so the first one must be spoken.
        announceInitial
      />
    </section>
  );
};

export default ScenarioZone;
