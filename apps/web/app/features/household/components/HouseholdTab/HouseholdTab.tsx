import { Card, PageSection } from "@repo/ui";
import { Users } from "lucide-react";
import type { FC } from "react";
import { useFetcher } from "react-router";
import {
  HOUSEHOLD_INTENT,
  type HouseholdActionData,
  type HouseholdSettingsData,
} from "../../household";
import { InvitationLinkPanel } from "../InvitationLinkPanel";
import { JointSummaryList } from "../JointSummaryList";
import { LeaveHouseholdSection } from "../LeaveHouseholdSection";
import { SharingHelpLine } from "../SharingHelpLine";
import { WhatIShareSection } from "../WhatIShareSection";
import { householdCard, householdStatus, householdTabStack } from "./HouseholdTab.styles";

export interface HouseholdTabProps {
  /** From the settings loader; the tab exists only when the backend answered GET /household. */
  data: HouseholdSettingsData;
}

const errorOf = (result: HouseholdActionData | undefined, idle: boolean): string | null =>
  idle && result && "error" in result ? result.error : null;

/**
 * Settings, Household tab (E34 C3). In a household it opens on who the household is with and how
 * to leave, then the person's one sharing switch and the read-only summary. Not in one, it offers
 * a link to pass on. Every action is the person's own; nothing here acts on the other person.
 */
export const HouseholdTab: FC<HouseholdTabProps> = ({ data }) => {
  const linkFetcher = useFetcher<HouseholdActionData>();
  const shareFetcher = useFetcher<HouseholdActionData>();
  const leaveFetcher = useFetcher<HouseholdActionData>();
  const { household, invitation } = data.state;

  const submit = (fetcher: typeof linkFetcher, fields: Record<string, string>) =>
    fetcher.submit(fields, { method: "post" });

  if (household) {
    // Shows the choice being saved at once; the loader's value once it is saved.
    const sharingPending = shareFetcher.formData?.get("sharesJointSummary");
    const sharesJointSummary =
      typeof sharingPending === "string" ? sharingPending === "true" : household.sharesJointSummary;
    return (
      <div
        className={householdTabStack()}
        id="settings-household-tab"
        data-testid="settings-household-tab"
      >
        <PageSection icon={Users} id="household-membership" title="Your household" tone="neutral">
          <Card className={householdCard()}>
            <p className={householdStatus()} id="household-with" data-testid="household-with">
              {household.withName
                ? `You share a household with ${household.withName}.`
                : "You share a household with the other person."}
            </p>
            <LeaveHouseholdSection
              error={errorOf(leaveFetcher.data, leaveFetcher.state === "idle")}
              pending={leaveFetcher.state !== "idle"}
              onConfirm={() => submit(leaveFetcher, { intent: HOUSEHOLD_INTENT.leave })}
            />
          </Card>
        </PageSection>
        <WhatIShareSection
          error={errorOf(shareFetcher.data, shareFetcher.state === "idle")}
          pending={shareFetcher.state !== "idle"}
          sharesJointSummary={sharesJointSummary}
          onChange={(next) =>
            submit(shareFetcher, {
              intent: HOUSEHOLD_INTENT.sharing,
              sharesJointSummary: String(next),
            })
          }
        />
        <JointSummaryList items={data.jointSummary} otherName={household.withName} />
        <SharingHelpLine />
      </div>
    );
  }

  const created =
    linkFetcher.state === "idle" &&
    linkFetcher.data &&
    "intent" in linkFetcher.data &&
    linkFetcher.data.intent === HOUSEHOLD_INTENT.createLink
      ? linkFetcher.data
      : null;
  const linkIntent = linkFetcher.formData?.get("intent");
  return (
    <div
      className={householdTabStack()}
      id="settings-household-tab"
      data-testid="settings-household-tab"
    >
      <InvitationLinkPanel
        error={errorOf(linkFetcher.data, linkFetcher.state === "idle")}
        expiresAt={created ? created.expiresAt : (invitation?.expiresAt ?? null)}
        link={created ? created.link : null}
        pending={
          linkFetcher.state === "idle"
            ? null
            : linkIntent === HOUSEHOLD_INTENT.cancelLink
              ? "cancel"
              : "create"
        }
        onCancel={() => submit(linkFetcher, { intent: HOUSEHOLD_INTENT.cancelLink })}
        onCreate={() => submit(linkFetcher, { intent: HOUSEHOLD_INTENT.createLink })}
      />
      <p className={householdStatus()}>
        To join someone else's household, open the link they gave you.
      </p>
      <SharingHelpLine />
    </div>
  );
};

export default HouseholdTab;
