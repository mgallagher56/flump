import { CircleDashed, RotateCcw } from "lucide-react";
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
  /**
   * Called by "Reset to saved figures". Restores scenario inputs to the saved values. The button
   * shows in the footer only while `isModified` (E16 round 3): nothing to reset, nothing shown.
   * After a reset, focus moves to the zone heading, since the button it was on goes away.
   */
  onReset?: () => void;
  /**
   * Tool switcher rendered above the content: `<Tabs size="sm">`, at most 3 tools, one visible at
   * a time (E16 P1.7).
   */
  tools?: ReactNode;
  /** The what-if tool(s). They sit on the zone surface: no nested cards or headings. */
  children?: ReactNode;
  /** The "Update your details" link. It opens the normal edit form with the SAVED values. */
  footer?: ReactNode;
  /**
   * Holds the page's single `ProjectionNotice` (E16 P4.1), shown at the foot of the zone. Its
   * wording never changes (D14): pass the notice element here to place it, not to reword it.
   * Defaults to the standard `ProjectionNotice`.
   */
  notice?: ReactNode;
  /**
   * Outcome text announced politely, prefixed with "Illustration:". Keep it empty until the user
   * changes an input, and derive it only while `isModified`. A non-empty value present at mount
   * is spoken once.
   */
  announcement?: string;
  /** Id for the section element. */
  id?: string;
  /**
   * Shows the notice in the zone footer. Default true. Pass false only when the page already shows
   * its one notice elsewhere, so it appears once per page.
   */
  showNotice?: boolean;
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
  notice,
  announcement,
  id,
  showNotice = true,
  className,
}) => {
  const headingId = useId();
  const slots = scenarioZone();
  const resolvedNotice = showNotice ? (notice ?? <ProjectionNotice />) : null;
  const showReset = Boolean(onReset) && isModified;
  const hasActions = showReset || Boolean(footer);
  const handleReset = () => {
    onReset?.();
    document.getElementById(headingId)?.focus();
  };
  return (
    <section
      aria-labelledby={headingId}
      id={id}
      className={cx(slots.root, className)}
      data-testid="scenario-zone"
    >
      <div className={slots.header}>
        <div className={slots.titleRow}>
          <Heading as="h2" data-testid="scenario-zone-title" id={headingId} size="md" tabIndex={-1}>
            {title}
          </Heading>
          <StatusBadge variant="neutral" icon={<Icon icon={CircleDashed} size="sm" />}>
            {SCENARIO_BADGE_TEXT}
          </StatusBadge>
        </div>
        {basis ? <p className={slots.basis}>{basis}</p> : null}
      </div>
      {tools}
      <div className={slots.body}>{children}</div>
      {hasActions || resolvedNotice ? (
        // id and data-testid pair (component guidelines); a page has one scenario zone.
        <div className={slots.footer} data-testid="scenario-zone-footer" id="scenario-zone-footer">
          {hasActions ? (
            <div className={slots.footerActions}>
              {showReset ? (
                <Button
                  className={slots.reset}
                  size="sm"
                  type="button"
                  variant="secondary"
                  onClick={handleReset}
                >
                  <Icon icon={RotateCcw} size="sm" />
                  {SCENARIO_RESET_LABEL}
                </Button>
              ) : null}
              {footer}
            </div>
          ) : null}
          {resolvedNotice}
        </div>
      ) : null}
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
