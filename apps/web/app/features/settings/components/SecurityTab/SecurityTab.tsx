import { Button, Card, Icon, useOptionalToast } from "@repo/ui";
import { KeyRound, Mail } from "lucide-react";
import { type FC, useState } from "react";
import {
  McpConnectionCard,
  STAGE_SCOPE,
} from "~/features/ai-connections/components/McpConnectionCard";
import { useMcpTokens } from "~/features/ai-connections/useMcpTokens";
import {
  sectionCard,
  sectionHeading,
  sectionLead,
  statusText,
  tabStack,
} from "~/features/settings/settings.styles";
import { useUserProfile } from "~/hooks/useUserProfile";
import {
  accountEmail,
  accountIcon,
  accountIdentity,
  accountLabel,
  accountRow,
} from "./SecurityTab.styles";

export interface SecurityTabProps {
  /** The sign-in email shown to the person. */
  email?: string | null;
}

/** Sign-in security and AI access: password reset by email and the MCP connection card. */
export const SecurityTab: FC<SecurityTabProps> = ({ email }) => {
  const { sendPasswordResetEmail } = useUserProfile();
  // A toast as well as the status line; a no-op when rendered without a ToastProvider.
  const toast = useOptionalToast()?.toast;
  const mcp = useMcpTokens();
  // Imports are reached from here once a connection may stage them (owner-only rollout: a user who
  // cannot mint such a token never sees the link).
  const canStage = (mcp.tokens ?? []).some((t) => t.scopes.includes(STAGE_SCOPE));
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);

  const handleSendResetEmail = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);
    setSendingResetEmail(true);
    try {
      // Fixed copy on success too: the server's message is never shown (COPY-AUDIT PR 9).
      await sendPasswordResetEmail();
      setPasswordSuccess("We have emailed you a link to choose a new password.");
      toast?.({ title: "Email sent", tone: "positive" });
    } catch {
      // Never a raw server message (COPY-AUDIT PR 9).
      setPasswordError("We could not send the email. Your password is unchanged. Try again.");
    } finally {
      setSendingResetEmail(false);
    }
  };

  return (
    <div className={tabStack()} id="settings-security-tab" data-testid="settings-security-tab">
      <Card as="section" aria-labelledby="sign-in-heading" className={sectionCard()}>
        <h2 className={sectionHeading()} id="sign-in-heading">
          How you sign in
        </h2>
        <div className={accountRow()}>
          <div className={accountIdentity()}>
            <span aria-hidden="true" className={accountIcon()}>
              <Icon icon={Mail} size="md" />
            </span>
            <div>
              <p className={accountLabel()}>Account email</p>
              <div
                className={accountEmail()}
                data-testid="user-email-display"
                id="user-email-display"
              >
                {/* No "Verified" badge: nothing here reads the provider's verified flag (ruling 4). */}
                <span>{email || "Not set"}</span>
              </div>
            </div>
          </div>
          <Button
            data-testid="change-password-trigger"
            id="change-password-trigger"
            pending={sendingResetEmail}
            size="sm"
            type="button"
            variant="outline"
            onClick={handleSendResetEmail}
          >
            <Icon icon={KeyRound} size="sm" />
            Change password
          </Button>
        </div>
        <p className={sectionLead()}>We will email you a link to choose a new password.</p>
        {passwordSuccess ? (
          <p
            className={statusText({ tone: "positive" })}
            data-testid="password-reset-status"
            id="password-reset-status"
            role="status"
          >
            {passwordSuccess}
          </p>
        ) : null}
        {passwordError ? (
          <p
            className={statusText({ tone: "danger" })}
            data-testid="password-reset-error"
            id="password-reset-error"
            role="alert"
          >
            {passwordError}
          </p>
        ) : null}
      </Card>

      <McpConnectionCard
        initialTokens={mcp.tokens ?? []}
        // Remount once the saved tokens arrive, so the card starts from them.
        key={mcp.tokens ? "loaded" : "loading"}
        onFetchContextPack={mcp.contextPack}
        onGenerateToken={mcp.create}
        onRevokeToken={mcp.revoke}
      />

      {canStage ? (
        <Card as="section" aria-labelledby="settings-imports-heading" className={sectionCard()}>
          <h2 className={sectionHeading()} id="settings-imports-heading">
            Imports
          </h2>
          <p className={sectionLead()}>
            Balances added through a connection wait in Imports until you review and confirm them.
          </p>
          <div>
            <Button asChild size="sm" variant="outline">
              <a data-testid="settings-imports-link" href="/app/imports" id="settings-imports-link">
                Review imports
              </a>
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
};
