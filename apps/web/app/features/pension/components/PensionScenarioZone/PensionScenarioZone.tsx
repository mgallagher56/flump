import { Button, Icon, LiveRegion, ProjectionNotice, StatusBadge } from "@repo/ui";
import { RotateCcw } from "lucide-react";
import type { FC, ReactNode } from "react";
import {
  zoneBasis,
  zoneFooter,
  zoneHeader,
  zoneHeadingRow,
  zoneRoot,
  zoneTitle,
} from "./PensionScenarioZone.styles";

export interface PensionScenarioZoneProps {
  /** Starting figures, for example "£50,000 salary, 6% you and 4% your employer". Omit when unknown. */
  basis?: ReactNode;
  isModified: boolean;
  onReset: () => void;
  /** Opens the normal edit form for saved details. Shown as "Update your details". */
  onEditDetails?: () => void;
  /** Outcome sentence for assistive tech. Announced as "Illustration: ...". Empty announces nothing. */
  announcement?: string;
  children: ReactNode;
}

const HEADING_ID = "pension-scenario-zone-title";
export const PENSION_SCENARIO_ZONE_ID = "pension-scenario-zone";

/**
 * Local scenario zone for the pension page. Everything inside is an illustration: it is never
 * saved and never feeds a headline figure.
 * TODO(E15 scenario zone): swap for @repo/ui ScenarioZone and useScenarioState when they land.
 */
export const PensionScenarioZone: FC<PensionScenarioZoneProps> = ({
  basis,
  isModified,
  onReset,
  onEditDetails,
  announcement = "",
  children,
}) => (
  <section aria-labelledby={HEADING_ID} className={zoneRoot()} id={PENSION_SCENARIO_ZONE_ID}>
    <div className={zoneHeader()}>
      <div className={zoneHeadingRow()}>
        <h2 className={zoneTitle()} id={HEADING_ID}>
          Model a change to your pension
        </h2>
        <StatusBadge size="sm" variant="neutral">
          Illustration, not saved
        </StatusBadge>
      </div>
      {isModified && (
        <Button size="sm" type="button" variant="outline" onClick={onReset}>
          <Icon icon={RotateCcw} size="sm" />
          Reset to saved figures
        </Button>
      )}
    </div>
    <ProjectionNotice />
    {basis ? <p className={zoneBasis()}>Starting from your figures: {basis}</p> : null}
    <LiveRegion
      debounceMs={1000}
      message={announcement ? `Illustration: ${announcement}` : ""}
      visuallyHidden
    />
    {children}
    {onEditDetails && (
      <div className={zoneFooter()}>
        <span>Changes here are not saved.</span>
        <Button size="sm" type="button" variant="link" onClick={onEditDetails}>
          Update your details
        </Button>
      </div>
    )}
  </section>
);

export default PensionScenarioZone;
