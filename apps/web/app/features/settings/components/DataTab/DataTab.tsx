import { Button, Card, ConfirmDialog } from "@repo/ui";
import { type FC, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { RECENT_LOGIN_MESSAGE } from "~/features/settings/account";
import { DataExportSection } from "~/features/settings/components/DataExportSection";
import { DeleteAccountSection } from "~/features/settings/components/DeleteAccountSection";
import { SignInAgainButton } from "~/features/settings/components/SignInAgainButton";
import { useDeleteAccount } from "~/features/settings/hooks/useDeleteAccount";
import {
  sectionCard,
  sectionHeading,
  sectionLead,
  statusText,
  tabStack,
} from "~/features/settings/settings.styles";
import {
  RESET_FINANCIAL_DATA_CONFIRMATION,
  RecentLoginRequiredError,
  useUserProfile,
} from "~/hooks/useUserProfile";
import {
  dangerCopy,
  dangerRow,
  dangerText,
  dangerTitle,
  dialogBody,
  wipeList,
} from "./DataTab.styles";

/** How long the success message shows before sending the person back to onboarding. */
const SUCCESS_REDIRECT_MS = 1500;

/**
 * Your data: download a copy, reset all financial data, or delete the account. The reset and the
 * deletion each sit behind a type-to-confirm dialog.
 */
export const DataTab: FC = () => {
  const { resetFinancialData } = useUserProfile();
  const { status: deleteStatus, submit: handleDeleteAccount } = useDeleteAccount();

  let navigate: (to: string) => void;
  try {
    // biome-ignore lint/correctness/useHookAtTopLevel: fallback when rendered outside Router in unit tests
    navigate = useNavigate();
  } catch {
    navigate = (to: string) => {
      if (typeof window !== "undefined") window.location.href = to;
    };
  }

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resettingData, setResettingData] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetNeedsSignIn, setResetNeedsSignIn] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Keep the redirect timer so leaving the page cancels it, and block a second submit while the
  // first reset is in flight (the dialog's pending state is a render behind a fast double click).
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetInFlight = useRef(false);
  useEffect(
    () => () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    },
    [],
  );

  const handleResetFinancialData = async () => {
    if (resetInFlight.current) return;
    resetInFlight.current = true;
    setResettingData(true);
    setResetError(null);
    setResetNeedsSignIn(false);
    try {
      await resetFinancialData();
      setResetSuccess(true);
      redirectTimer.current = setTimeout(() => {
        redirectTimer.current = null;
        setResetModalOpen(false);
        setResetSuccess(false);
        navigate("/app/onboarding");
      }, SUCCESS_REDIRECT_MS);
    } catch (err) {
      resetInFlight.current = false;
      if (err instanceof RecentLoginRequiredError) {
        setResetNeedsSignIn(true);
        setResetError(RECENT_LOGIN_MESSAGE);
        return;
      }
      setResetError(
        err instanceof Error && err.message
          ? err.message
          : "We could not reset your financial data. Try again.",
      );
    } finally {
      setResettingData(false);
    }
  };

  return (
    <div className={tabStack()} id="settings-data-tab" data-testid="settings-data-tab">
      <DataExportSection />

      <Card as="section" aria-labelledby="reset-data-heading" className={sectionCard()}>
        <h2 className={sectionHeading()} id="reset-data-heading">
          Reset your financial data
        </h2>
        <p className={sectionLead()}>
          Start again from scratch. This removes everything you have added about your money.
        </p>
        <div className={dangerRow()}>
          <div className={dangerText()}>
            <p className={dangerTitle()}>This cannot be undone</p>
            <p className={dangerCopy()}>
              Deletes all your accounts, transactions, bank connections, budget entries and tax
              records.
            </p>
          </div>
          <Button
            data-testid="reset-financial-data-trigger"
            id="reset-financial-data-trigger"
            size="sm"
            type="button"
            variant="destructive"
            onClick={() => {
              setResetError(null);
              setResetNeedsSignIn(false);
              setResetSuccess(false);
              setResetModalOpen(true);
            }}
          >
            Reset all financial data
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        id="reset-financial-data-dialog"
        open={resetModalOpen}
        onOpenChange={(open) => {
          setResetModalOpen(open);
          if (!open) {
            setResetError(null);
            setResetNeedsSignIn(false);
          }
        }}
        title="Reset all financial data"
        description={
          <div className={dialogBody()}>
            <span>
              This is <strong>permanent</strong> and immediately wipes:
            </span>
            <ul className={wipeList()}>
              <li>All connected and manual accounts</li>
              <li>All transaction history and balances</li>
              <li>All budget entries and recurring rules</li>
              <li>All income and expense tax records</li>
              <li>All property, salary and savings settings</li>
            </ul>
            <span>You will start again from scratch.</span>
            {resetSuccess ? (
              <p className={statusText({ tone: "positive" })} role="status">
                All financial data wiped. You have a clean slate.
              </p>
            ) : null}
          </div>
        }
        confirmLabel="Reset everything"
        pendingLabel="Resetting"
        tone="danger"
        requireText={RESET_FINANCIAL_DATA_CONFIRMATION}
        pending={resettingData || resetSuccess}
        error={resetError}
        errorAction={resetNeedsSignIn ? <SignInAgainButton /> : undefined}
        onConfirm={handleResetFinancialData}
      />

      <DeleteAccountSection status={deleteStatus} onConfirm={handleDeleteAccount} />
    </div>
  );
};
