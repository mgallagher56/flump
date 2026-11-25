import { Card, InlineAlert, PageSection, Switch } from "@repo/ui";
import { Eye } from "lucide-react";
import type { FC } from "react";
import { shareStack } from "./WhatIShareSection.styles";

export const SHARE_SWITCH_LABEL =
  "Show the accounts I have marked joint in the household summary: name, type and whole balance.";

export interface WhatIShareSectionProps {
  /** The person's own choice. Off by default, and nothing is shared until they turn it on. */
  sharesJointSummary: boolean;
  pending: boolean;
  error: string | null;
  onChange: (sharesJointSummary: boolean) => void;
}

/** What I share (E34 C3): one switch, the person's own, for their joint accounts only. */
export const WhatIShareSection: FC<WhatIShareSectionProps> = ({
  sharesJointSummary,
  pending,
  error,
  onChange,
}) => (
  <PageSection
    description="Nothing is shared until you choose it here. Nothing else of yours is shared."
    icon={Eye}
    id="household-what-i-share"
    title="What I share"
    tone="neutral"
  >
    <Card className={shareStack()}>
      <Switch
        checked={sharesJointSummary}
        disabled={pending}
        id="household-share-joint-summary"
        label={SHARE_SWITCH_LABEL}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
    </Card>
  </PageSection>
);

export default WhatIShareSection;
