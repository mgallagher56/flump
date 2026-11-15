import type { SampleHouseholdKey } from "@flump/finance-engine";
import { type FC, useMemo, useState } from "react";
import { Button } from "../../primitives/Button/Button";
import { CurrencyInput } from "../../primitives/CurrencyInput/CurrencyInput";
import { LiveRegion } from "../../primitives/LiveRegion/LiveRegion";
import { formatMoney } from "../../primitives/Money/Money";
import { StatusBadge } from "../../primitives/StatusBadge/StatusBadge";
import {
  checkInAccountName,
  checkInActions,
  checkInBalanceLine,
  checkInCardSurface,
  checkInHeader,
  checkInInputRow,
  checkInNav,
  checkInProgress,
  checkInRoot,
  checkInSummaryItem,
  checkInSummaryList,
  summaryItemFigure,
  summaryItemName,
} from "./CheckInPreview.styles";

export interface CheckInPreviewAccount {
  id: string;
  name: string;
  type: string;
  savedBalance: number;
  calculatedBalance?: number;
}

export interface CheckInPreviewProps {
  id?: string;
  household?: SampleHouseholdKey;
  className?: string;
}

const RENTER_ACCOUNTS: CheckInPreviewAccount[] = [
  { id: "current", name: "Monzo current", type: "Current account", savedBalance: 1850 },
  { id: "isa", name: "Cash ISA", type: "Cash ISA", savedBalance: 4200 },
  { id: "loan", name: "Student loan", type: "Student loan", savedBalance: 41500 },
];

const HOMEOWNER_ACCOUNTS: CheckInPreviewAccount[] = [
  { id: "cash", name: "Cash and emergency savings", type: "Savings", savedBalance: 21000 },
  { id: "pension", name: "Workplace and personal pension", type: "Pension", savedBalance: 96000 },
  {
    id: "mortgage",
    name: "Residential Mortgage",
    type: "Mortgage",
    savedBalance: 186000,
    calculatedBalance: 185420,
  },
];

type RecordKind = "update" | "no-change" | "calculated";

interface RecordedStep {
  kind: RecordKind;
  value: number;
}

export const CheckInPreview: FC<CheckInPreviewProps> = ({
  id = "checkin-preview",
  household = "renter",
  className,
}) => {
  const accounts = useMemo(
    () => (household === "homeowner" ? HOMEOWNER_ACCOUNTS : RENTER_ACCOUNTS),
    [household],
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [recorded, setRecorded] = useState<Record<string, RecordedStep>>({});
  const [announcement, setAnnouncement] = useState("");

  const isDone = currentIndex >= accounts.length;
  const currentAccount = accounts[Math.min(currentIndex, accounts.length - 1)];

  const currentDraft = currentAccount
    ? (drafts[currentAccount.id] ?? currentAccount.savedBalance)
    : 0;

  const handleUpdate = () => {
    if (!currentAccount) return;
    const value = currentDraft;
    setRecorded((prev) => ({
      ...prev,
      [currentAccount.id]: { kind: "update", value },
    }));
    const nextIdx = currentIndex + 1;
    setCurrentIndex(nextIdx);
    setAnnouncement(
      nextIdx < accounts.length
        ? `Updated ${currentAccount.name}. Showing ${accounts[nextIdx]?.name}.`
        : "All accounts checked in.",
    );
  };

  const handleNoChange = () => {
    if (!currentAccount) return;
    const value = currentAccount.savedBalance;
    setRecorded((prev) => ({
      ...prev,
      [currentAccount.id]: { kind: "no-change", value },
    }));
    const nextIdx = currentIndex + 1;
    setCurrentIndex(nextIdx);
    setAnnouncement(
      nextIdx < accounts.length
        ? `Confirmed ${currentAccount.name}. Showing ${accounts[nextIdx]?.name}.`
        : "All accounts checked in.",
    );
  };

  const handleKeepCalculated = () => {
    if (!currentAccount || currentAccount.calculatedBalance === undefined) return;
    const value = currentAccount.calculatedBalance;
    setRecorded((prev) => ({
      ...prev,
      [currentAccount.id]: { kind: "calculated", value },
    }));
    const nextIdx = currentIndex + 1;
    setCurrentIndex(nextIdx);
    setAnnouncement(
      nextIdx < accounts.length
        ? `Kept calculated balance for ${currentAccount.name}. Showing ${accounts[nextIdx]?.name}.`
        : "All accounts checked in.",
    );
  };

  const handleNoChangeToRest = () => {
    const nextRecorded = { ...recorded };
    for (let i = currentIndex; i < accounts.length; i++) {
      const acc = accounts[i];
      if (acc && !nextRecorded[acc.id]) {
        nextRecorded[acc.id] = { kind: "no-change", value: acc.savedBalance };
      }
    }
    setRecorded(nextRecorded);
    setCurrentIndex(accounts.length);
    setAnnouncement("All remaining accounts confirmed with no change.");
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setDrafts({});
    setRecorded({});
    setAnnouncement("Check-in reset. Showing first account.");
  };

  const gbp = (val: number) => formatMoney(val, { fractionDigits: 0 }).text;

  return (
    <div className={`${checkInRoot()} ${className ?? ""}`.trim()} data-testid={id} id={id}>
      <LiveRegion message={announcement} politeness="polite" visuallyHidden />

      {!isDone && currentAccount ? (
        <>
          <p className={checkInProgress()} data-testid={`${id}-progress`} id={`${id}-progress`}>
            {currentIndex + 1} of {accounts.length}
          </p>

          <section
            aria-labelledby={`${id}-account-name`}
            className={checkInCardSurface()}
            data-testid={`${id}-card`}
          >
            <div className={checkInHeader()}>
              <h3 className={checkInAccountName()} id={`${id}-account-name`}>
                {currentAccount.name}
              </h3>
              <StatusBadge id={`${id}-account-type`} size="sm" variant="neutral">
                {currentAccount.type}
              </StatusBadge>
            </div>

            <p className={checkInBalanceLine()} id={`${id}-saved-balance`}>
              {currentAccount.calculatedBalance !== undefined
                ? `Calculated for this month: ${gbp(currentAccount.calculatedBalance)}`
                : `Saved balance: ${gbp(currentAccount.savedBalance)}`}
            </p>

            <div className={checkInInputRow()}>
              <CurrencyInput
                aria-label="New balance"
                data-testid={`${id}-input`}
                id={`${id}-input`}
                onValueChange={(val: number | null) => {
                  setDrafts((prev) => ({
                    ...prev,
                    [currentAccount.id]: typeof val === "number" ? val : 0,
                  }));
                }}
                value={currentDraft}
              />
            </div>

            <div className={checkInActions()}>
              <Button
                data-testid={`${id}-update`}
                id={`${id}-update`}
                onClick={handleUpdate}
                size="md"
                variant="primary"
              >
                Update
              </Button>
              {currentAccount.calculatedBalance !== undefined ? (
                <Button
                  data-testid={`${id}-keep`}
                  id={`${id}-keep`}
                  onClick={handleKeepCalculated}
                  size="md"
                  variant="outline"
                >
                  Keep this figure
                </Button>
              ) : (
                <Button
                  data-testid={`${id}-no-change`}
                  id={`${id}-no-change`}
                  onClick={handleNoChange}
                  size="md"
                  variant="outline"
                >
                  No change
                </Button>
              )}
            </div>
          </section>

          <footer className={checkInNav()}>
            {currentIndex > 0 ? (
              <Button
                data-testid={`${id}-back`}
                id={`${id}-back`}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                size="sm"
                variant="ghost"
              >
                Back
              </Button>
            ) : (
              <div />
            )}

            {accounts.length - currentIndex > 1 && (
              <Button
                data-testid={`${id}-no-change-rest`}
                id={`${id}-no-change-rest`}
                onClick={handleNoChangeToRest}
                size="sm"
                variant="ghost"
              >
                No change to the rest
              </Button>
            )}
          </footer>
        </>
      ) : (
        <section
          aria-labelledby={`${id}-complete-heading`}
          className={checkInCardSurface()}
          data-testid={`${id}-complete`}
        >
          <h3 className={checkInAccountName()} id={`${id}-complete-heading`}>
            Check-in complete for this month
          </h3>
          <p className={checkInBalanceLine()}>
            All {accounts.length} accounts have been checked in for this month.
          </p>

          <ul aria-label="Checked-in accounts" className={checkInSummaryList()}>
            {accounts.map((acc) => {
              const rec = recorded[acc.id];
              const val = rec ? rec.value : acc.savedBalance;
              return (
                <li className={checkInSummaryItem()} key={acc.id}>
                  <span className={summaryItemName()}>{acc.name}</span>
                  <span className={summaryItemFigure()}>
                    {gbp(val)} {rec?.kind === "update" ? "(Updated)" : "(Confirmed)"}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className={checkInActions()}>
            <Button
              data-testid={`${id}-reset`}
              id={`${id}-reset`}
              onClick={handleReset}
              size="md"
              variant="outline"
            >
              Step through again
            </Button>
          </div>
        </section>
      )}
    </div>
  );
};

export default CheckInPreview;
