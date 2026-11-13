import { Button, Icon, ProjectionNotice, StatusBadge } from "@repo/ui";
import { FlaskConical, RotateCcw } from "lucide-react";
import { type FC, type ReactNode, useId } from "react";
import {
  zoneBasis,
  zoneBody,
  zoneFooter,
  zoneHeader,
  zoneRoot,
  zoneTitle,
  zoneTitleRow,
} from "./ScenarioZone.styles";

export interface ScenarioZoneProps {
  /** Page-specific, for example "Model a change to your savings". */
  title: string;
  /** What the scenario starts from, for example "£62,000 gross salary". Rendered after "Starting from your figures:". */
  basis?: ReactNode;
  /** True once any scenario input differs from the saved figures. Enables the reset button. */
  isModified?: boolean;
  /** Puts every scenario input back to the saved figures. The reset button only shows when given. */
  onReset?: () => void;
  /** Show the guidance-not-advice notice inside the zone. Defaults to true. */
  showNotice?: boolean;
  /** Extra footer content, for example an "Update your details" link. */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Everything what-if on a page lives here, apart from saved details. Headline figures never read
 * these inputs and these inputs never write saved data (scenario-zone spec).
 *
 * Local stand-in until the shared `ScenarioZone` pattern lands in `@repo/ui`; swap for it then.
 */
export const ScenarioZone: FC<ScenarioZoneProps> = ({
  title,
  basis,
  isModified = false,
  onReset,
  showNotice = true,
  footer,
  children,
}) => {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={zoneRoot()}>
      <div className={zoneHeader()}>
        <div className={zoneTitleRow()}>
          <h2 className={zoneTitle()} id={headingId}>
            {title}
          </h2>
          <StatusBadge icon={<Icon icon={FlaskConical} size="sm" />} variant="neutral">
            Illustration, not saved
          </StatusBadge>
        </div>
        {onReset && (
          <Button disabled={!isModified} size="sm" variant="outline" onClick={onReset}>
            <Icon icon={RotateCcw} size="sm" />
            Reset to saved figures
          </Button>
        )}
      </div>
      {basis && <p className={zoneBasis()}>Starting from your figures: {basis}</p>}
      {showNotice && <ProjectionNotice />}
      <div className={zoneBody()}>{children}</div>
      {footer && <div className={zoneFooter()}>{footer}</div>}
    </section>
  );
};

export default ScenarioZone;
