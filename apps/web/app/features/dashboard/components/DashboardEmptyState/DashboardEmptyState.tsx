import { Button, EmptyState, Illustration } from "@repo/ui";
import type { FC } from "react";
import { SampleAwareLink } from "~/components/navigation/SampleAwareLink";
import { emptyStateSlot } from "./DashboardEmptyState.styles";

export interface DashboardEmptyStateProps {
  /** `setup`: nothing has figures yet. `hidden`: sections exist but the user hid them all. */
  reason: "setup" | "hidden";
  /** Opens "Choose what shows here". Used by the `hidden` reason. */
  onChooseWidgets?: () => void;
}

/** Shown when the section grid would be empty. One button, always a next action. */
export const DashboardEmptyState: FC<DashboardEmptyStateProps> = ({ reason, onChooseWidgets }) => (
  <div className={emptyStateSlot()}>
    {reason === "hidden" ? (
      <EmptyState
        action={
          <Button id="dashboard-empty-choose" size="sm" onClick={onChooseWidgets}>
            Choose what shows here
          </Button>
        }
        description="Every section is hidden. Choose which ones to show."
        id="dashboard-empty-state"
        illustration={<Illustration scene="empty-goals" size="md" />}
        title="Nothing to show yet"
      />
    ) : (
      <EmptyState
        action={
          <Button asChild size="sm">
            <SampleAwareLink to="/app/accounts">Add an account</SampleAwareLink>
          </Button>
        }
        description="Add an account or your budget. Each section appears here once it has your figures."
        id="dashboard-empty-state"
        illustration={<Illustration scene="empty-accounts" size="md" />}
        title="Nothing to show yet"
      />
    )}
  </div>
);
