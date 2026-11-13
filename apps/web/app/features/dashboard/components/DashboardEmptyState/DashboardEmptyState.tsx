import { Button, EmptyState, Illustration } from "@repo/ui";
import type { FC } from "react";
import { SampleAwareLink } from "~/components/navigation/SampleAwareLink";
import { emptyStateSlot } from "./DashboardEmptyState.styles";

export interface DashboardEmptyStateProps {
  /** `setup`: nothing is configured yet. `hidden`: widgets exist but the user hid them all. */
  reason: "setup" | "hidden";
  /** Opens the show or hide checklist. Used by the `hidden` reason. */
  onChooseWidgets?: () => void;
}

/** Shown when the widget grid would be empty. Always offers a next action. */
export const DashboardEmptyState: FC<DashboardEmptyStateProps> = ({ reason, onChooseWidgets }) => (
  <div className={emptyStateSlot()}>
    {reason === "hidden" ? (
      <EmptyState
        action={
          <Button id="dashboard-empty-choose" size="sm" onClick={onChooseWidgets}>
            Show or hide widgets
          </Button>
        }
        description="Every widget is hidden. Choose the ones you want back."
        id="dashboard-empty-state"
        illustration={<Illustration scene="empty-goals" size="md" />}
        title="No widgets showing"
      />
    ) : (
      <EmptyState
        action={
          <Button asChild size="sm">
            <SampleAwareLink to="/app/accounts">Add an account</SampleAwareLink>
          </Button>
        }
        description="Finish the steps in the checklist above. Each widget appears here as soon as its section has your figures."
        id="dashboard-empty-state"
        illustration={<Illustration scene="empty-accounts" size="md" />}
        secondaryAction={
          <Button asChild size="sm" variant="ghost">
            <SampleAwareLink to="/app/budget">Add your budget</SampleAwareLink>
          </Button>
        }
        title="Build your dashboard"
      />
    )}
  </div>
);
