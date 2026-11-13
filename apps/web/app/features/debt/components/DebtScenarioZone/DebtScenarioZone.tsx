import { Button, Icon, ProjectionNotice, StatusBadge } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import type { FC, ReactNode } from "react";
import {
  basisLine,
  zoneHeader,
  zoneHeading,
  zoneRoot,
  zoneTitleRow,
} from "./DebtScenarioZone.styles";

export interface DebtScenarioZoneProps {
  /** Where the scenario starts from, for example "Starting from your figures: £8,400 owed...". */
  basis: string;
  /** True once any scenario input differs from the saved figures. */
  isModified: boolean;
  onReset: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * Local feature-level scenario zone for the debt page: every what-if tool lives inside it and
 * nothing in it is saved. Scenario state is held by the container in memory only.
 * TODO(E15 scenario zone): swap for the shared `ScenarioZone` pattern in `@repo/ui` and the
 * `useScenarioState` hook once the components lane lands them on main.
 */
export const DebtScenarioZone: FC<DebtScenarioZoneProps> = ({
  basis,
  isModified,
  onReset,
  children,
  className,
}) => (
  <section
    aria-labelledby="debt-scenario-heading"
    className={cx(zoneRoot(), className)}
    data-testid="debt-scenario-zone"
  >
    <div className={zoneHeader()}>
      <div className={zoneTitleRow()}>
        <h2 className={zoneHeading} id="debt-scenario-heading">
          Model a change to your debts
        </h2>
        <StatusBadge icon={<Icon icon={SlidersHorizontal} size="sm" />} variant="neutral">
          Illustration, not saved
        </StatusBadge>
      </div>
      {isModified ? (
        <Button size="sm" type="button" variant="outline" onClick={onReset}>
          <Icon icon={RotateCcw} size="sm" />
          Reset to saved figures
        </Button>
      ) : null}
    </div>
    <ProjectionNotice />
    <p className={basisLine}>{basis}</p>
    {children}
  </section>
);

export default DebtScenarioZone;
