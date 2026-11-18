import { SAMPLE_HOUSEHOLDS, type SampleHouseholdKey } from "@flump/finance-engine";
import { type FC, useMemo, useState } from "react";
import { Button } from "../../primitives/Button/Button";
import { CurrencyInput } from "../../primitives/CurrencyInput/CurrencyInput";
import { controlProps, FormField } from "../../primitives/FormField/FormField";
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
}

export interface CheckInPreviewProps {
  id?: string;
  household?: SampleHouseholdKey;
  className?: string;
}

export const CHECK_IN_EMPTY_BALANCE_ERROR = "Enter a balance, or choose No change.";

/** Sentence-case labels for the engine's account types ("Student Loan" reads "Student loan"). */
const TYPE_LABELS: Record<string, string> = {
  Current: "Current account",
  Saving: "Savings",
  Savings: "Savings",
};

/**
 * Bank and provider names a sample account must not show: a preview never implies an
 * endorsement, so such an account takes the neutral name of its type instead.
 */
const BRAND_NAMES =
  /\b(monzo|starling|revolut|barclays|hsbc|lloyds|natwest|santander|nationwide|halifax|chase|metro|tsb|first direct|virgin)\b/i;

const sentenceCase = (text: string): string =>
  text
    .split(" ")
    .map((word, index) => (index > 0 && /^[A-Z][a-z]+$/.test(word) ? word.toLowerCase() : word))
    .join(" ");

export const checkInTypeLabel = (type: string): string => TYPE_LABELS[type] ?? sentenceCase(type);

export const checkInAccountLabel = (name: string, type: string): string =>
  BRAND_NAMES.test(name) ? checkInTypeLabel(type) : sentenceCase(name);

/** The sample household's accounts, in the fixture's order, with their saved balances. */
export const checkInAccountsFor = (household: SampleHouseholdKey): CheckInPreviewAccount[] =>
  SAMPLE_HOUSEHOLDS[household].fixture.accounts.flatMap((account) => {
    const balance = Number(account.balance);
    // An account without a name, type or readable balance is left out, never shown as £0.
    if (!account.id || !account.name || !account.type || !Number.isFinite(balance)) return [];
    return [
      {
        id: account.id,
        name: checkInAccountLabel(account.name, account.type),
        type: checkInTypeLabel(account.type),
        savedBalance: balance,
      },
    ];
  });

type RecordKind = "update" | "no-change";

interface RecordedStep {
  kind: RecordKind;
  value: number;
}

export const CheckInPreview: FC<CheckInPreviewProps> = ({
  id = "checkin-preview",
  household = "renter",
  className,
}) => {
  const accounts = useMemo(() => checkInAccountsFor(household), [household]);

  const [currentIndex, setCurrentIndex] = useState(0);
  // `null` is an empty field: it stays null and is never saved as £0.
  const [drafts, setDrafts] = useState<Record<string, number | null>>({});
  const [recorded, setRecorded] = useState<Record<string, RecordedStep>>({});
  const [announcement, setAnnouncement] = useState("");
  const [showEmptyError, setShowEmptyError] = useState(false);

  const isDone = currentIndex >= accounts.length;
  const currentAccount = accounts[Math.min(currentIndex, accounts.length - 1)];

  const currentDraft: number | null = currentAccount
    ? currentAccount.id in drafts
      ? (drafts[currentAccount.id] ?? null)
      : currentAccount.savedBalance
    : null;

  const advance = (verb: string) => {
    if (!currentAccount) return;
    const nextIdx = currentIndex + 1;
    setCurrentIndex(nextIdx);
    setShowEmptyError(false);
    setAnnouncement(
      nextIdx < accounts.length
        ? `${verb} ${currentAccount.name}. Showing ${accounts[nextIdx]?.name}.`
        : "All accounts checked in.",
    );
  };

  const handleUpdate = () => {
    if (!currentAccount) return;
    if (currentDraft === null) {
      setShowEmptyError(true);
      return;
    }
    const value = currentDraft;
    setRecorded((prev) => ({ ...prev, [currentAccount.id]: { kind: "update", value } }));
    advance("Updated");
  };

  const handleNoChange = () => {
    if (!currentAccount) return;
    const value = currentAccount.savedBalance;
    setRecorded((prev) => ({ ...prev, [currentAccount.id]: { kind: "no-change", value } }));
    advance("Confirmed");
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setDrafts({});
    setRecorded({});
    setShowEmptyError(false);
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
              {currentAccount.type !== currentAccount.name && (
                <StatusBadge id={`${id}-account-type`} size="sm" variant="neutral">
                  {currentAccount.type}
                </StatusBadge>
              )}
            </div>

            <p className={checkInBalanceLine()} id={`${id}-saved-balance`}>
              Saved balance: {gbp(currentAccount.savedBalance)}
            </p>

            <div className={checkInInputRow()}>
              <FormField
                error={
                  showEmptyError && currentDraft === null ? CHECK_IN_EMPTY_BALANCE_ERROR : undefined
                }
                id={`${id}-input`}
                label="New balance"
              >
                {(field) => (
                  <CurrencyInput
                    {...controlProps(field)}
                    data-testid={`${id}-input`}
                    onValueChange={(val: number | null) => {
                      setDrafts((prev) => ({ ...prev, [currentAccount.id]: val }));
                      if (val !== null) setShowEmptyError(false);
                    }}
                    value={currentDraft}
                  />
                )}
              </FormField>
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
              <Button
                data-testid={`${id}-no-change`}
                id={`${id}-no-change`}
                onClick={handleNoChange}
                size="md"
                variant="outline"
              >
                No change
              </Button>
            </div>
          </section>

          <footer className={checkInNav()}>
            {currentIndex > 0 ? (
              <Button
                data-testid={`${id}-back`}
                id={`${id}-back`}
                onClick={() => {
                  setShowEmptyError(false);
                  setCurrentIndex((prev) => Math.max(0, prev - 1));
                }}
                size="sm"
                variant="ghost"
              >
                Back
              </Button>
            ) : (
              <div />
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
                    {gbp(val)} {rec?.kind === "update" ? "(updated)" : "(confirmed)"}
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
