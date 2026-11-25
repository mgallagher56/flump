import type { HouseholdJointSummaryItem } from "@flump/api-contract";
import { Card, Money, PageSection } from "@repo/ui";
import { ListChecks } from "lucide-react";
import type { FC } from "react";
import { TYPE_LABEL } from "~/features/accounts/components/AccountsGroupList";
import {
  summaryBalance,
  summaryItem,
  summaryList,
  summaryMeta,
  summaryName,
  summaryNote,
  summaryText,
} from "./JointSummaryList.styles";

export const DUPLICATE_NOTE = "If you have both added the same account, it appears twice.";

export interface JointSummaryListProps {
  /** The shared joint accounts in the backend's order; null when they could not be read. */
  items: HouseholdJointSummaryItem[] | null;
  /** The other person's first name, or null. */
  otherName: string | null;
}

const addedByText = (addedBy: HouseholdJointSummaryItem["addedBy"], otherName: string | null) =>
  addedBy === "you" ? "Added by you" : `Added by ${otherName ?? "the other person"}`;

/**
 * The household summary (E34 C3): read only, the joint accounts each person chose to show, each
 * with its whole balance as its owner holds it. No total and no count: an account both people
 * added shows twice, and pairing the copies waits for slice C2. Whether the other person shares is
 * never said: with nothing shown the text is the same either way (G3).
 */
export const JointSummaryList: FC<JointSummaryListProps> = ({ items, otherName }) => (
  <PageSection
    description="Joint accounts each of you chose to show. Read only."
    icon={ListChecks}
    id="household-joint-summary"
    title="Household summary"
    tone="neutral"
  >
    <Card>
      {items === null ? (
        <p className={summaryText()} role="status">
          We could not load the household summary. Reload the page to try again.
        </p>
      ) : items.length === 0 ? (
        <p className={summaryText()}>
          No accounts are shown here yet. Each of you chooses whether to show the accounts you have
          marked joint.
        </p>
      ) : (
        <>
          <ul aria-label="Shared joint accounts" className={summaryList()}>
            {items.map((item, index) => (
              <li
                className={summaryItem()}
                key={`${item.addedBy}-${item.name}-${item.type}-${index}`}
              >
                <div>
                  <p className={summaryName()}>{item.name}</p>
                  <p className={summaryMeta()}>
                    {TYPE_LABEL[item.type] ?? item.type} · {addedByText(item.addedBy, otherName)}
                  </p>
                </div>
                <Money
                  className={summaryBalance()}
                  fractionDigits={2}
                  size="sm"
                  value={item.wholeBalance}
                />
              </li>
            ))}
          </ul>
          <p className={summaryNote()}>{DUPLICATE_NOTE}</p>
        </>
      )}
    </Card>
  </PageSection>
);

export default JointSummaryList;
